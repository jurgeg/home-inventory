# Home Inventory PWA — Backend Technical Specification

**Stack:** Supabase (PostgreSQL 15+, Auth, Storage, Edge Functions)
**Date:** 2026-02-07
**Status:** Draft v1

---

## 1. Database Schema

### 1.1 Extensions & Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- fuzzy text search

-- Custom types
CREATE TYPE item_condition AS ENUM (
  'new', 'like_new', 'good', 'fair', 'poor', 'broken'
);

CREATE TYPE value_confidence AS ENUM (
  'ai_estimated', 'user_provided', 'verified'
);
```

### 1.2 Profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  default_property_id UUID,  -- FK added after properties table
  ai_credits_used INT NOT NULL DEFAULT 0,
  ai_credits_limit INT NOT NULL DEFAULT 100,  -- per month
  ai_credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  preferences JSONB NOT NULL DEFAULT '{
    "theme": "system",
    "defaultCamera": "back",
    "autoIdentify": true,
    "compressImages": true,
    "imageQuality": 0.8
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 1.3 Properties

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "My Flat", "Mum's House"
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  property_type TEXT,              -- flat, house, garage, storage_unit
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_user ON properties(user_id);

-- Now add the FK from profiles
ALTER TABLE profiles
  ADD CONSTRAINT fk_default_property
  FOREIGN KEY (default_property_id) REFERENCES properties(id) ON DELETE SET NULL;
```

### 1.4 Locations (Room → Spot Hierarchy)

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,  -- NULL = room, non-NULL = spot within room
  name TEXT NOT NULL,              -- "Kitchen", "Under Sink"
  icon TEXT,                       -- emoji or icon key
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Max 2 levels: room → spot (enforced by trigger)
  CONSTRAINT no_deep_nesting CHECK (parent_id IS NULL OR parent_id != id)
);

CREATE INDEX idx_locations_property ON locations(property_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);

-- Enforce max depth of 2
CREATE OR REPLACE FUNCTION check_location_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM locations WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Locations can only be nested 2 levels deep (room → spot)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_location_depth
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION check_location_depth();
```

### 1.5 Categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system default
  name TEXT NOT NULL,
  icon TEXT,                       -- emoji
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user ON categories(user_id);

-- Seed system categories
INSERT INTO categories (id, user_id, name, icon) VALUES
  (uuid_generate_v4(), NULL, 'Electronics', '💻'),
  (uuid_generate_v4(), NULL, 'Furniture', '🪑'),
  (uuid_generate_v4(), NULL, 'Kitchen & Dining', '🍳'),
  (uuid_generate_v4(), NULL, 'Clothing', '👕'),
  (uuid_generate_v4(), NULL, 'Books & Media', '📚'),
  (uuid_generate_v4(), NULL, 'Tools & DIY', '🔧'),
  (uuid_generate_v4(), NULL, 'Garden', '🌱'),
  (uuid_generate_v4(), NULL, 'Sports & Leisure', '⚽'),
  (uuid_generate_v4(), NULL, 'Art & Decor', '🖼️'),
  (uuid_generate_v4(), NULL, 'Appliances', '🔌'),
  (uuid_generate_v4(), NULL, 'Toys & Games', '🎮'),
  (uuid_generate_v4(), NULL, 'Jewellery & Watches', '💍'),
  (uuid_generate_v4(), NULL, 'Musical Instruments', '🎸'),
  (uuid_generate_v4(), NULL, 'Other', '📦');
```

### 1.6 Items

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,

  condition item_condition DEFAULT 'good',
  quantity INT NOT NULL DEFAULT 1,

  -- Value tracking
  estimated_value_low NUMERIC(10,2),   -- pence precision
  estimated_value_high NUMERIC(10,2),
  purchase_price NUMERIC(10,2),
  value_confidence value_confidence DEFAULT 'ai_estimated',

  purchase_date DATE,
  warranty_expires DATE,

  notes TEXT,

  -- AI metadata
  ai_identified BOOLEAN NOT NULL DEFAULT FALSE,
  ai_raw_response JSONB,             -- store the full AI response for debugging

  -- Offline sync
  client_id TEXT,                     -- client-generated UUID for offline dedup
  synced_at TIMESTAMPTZ,

  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_items_location ON items(location_id);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_name_trgm ON items USING gin(name gin_trgm_ops);
CREATE INDEX idx_items_client_id ON items(user_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_items_created ON items(user_id, created_at DESC);
CREATE INDEX idx_items_archived ON items(user_id, is_archived) WHERE is_archived = FALSE;

-- Unique constraint for offline dedup
CREATE UNIQUE INDEX idx_items_dedup ON items(user_id, client_id) WHERE client_id IS NOT NULL;
```

### 1.7 Item Photos

```sql
CREATE TABLE item_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,          -- path in Supabase Storage
  thumbnail_path TEXT,                 -- smaller version
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  width INT,
  height INT,
  size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_item ON item_photos(item_id);

-- Only one primary photo per item
CREATE UNIQUE INDEX idx_photos_primary ON item_photos(item_id) WHERE is_primary = TRUE;
```

### 1.8 Tags

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,  -- hex color for UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, name)
);

CREATE TABLE item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_item_tags_tag ON item_tags(tag_id);
```

### 1.9 Updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 1.10 Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can only access their own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- PROPERTIES: users own their properties
CREATE POLICY properties_all ON properties FOR ALL USING (auth.uid() = user_id);

-- LOCATIONS: users access locations via their properties
CREATE POLICY locations_all ON locations FOR ALL
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = locations.property_id AND properties.user_id = auth.uid()));

-- CATEGORIES: users see system categories (user_id IS NULL) + their own
CREATE POLICY categories_select ON categories FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (user_id = auth.uid());

-- ITEMS: users own their items
CREATE POLICY items_all ON items FOR ALL USING (auth.uid() = user_id);

-- ITEM_PHOTOS: access via item ownership
CREATE POLICY photos_all ON item_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = item_photos.item_id AND items.user_id = auth.uid()));

-- TAGS: users own their tags
CREATE POLICY tags_all ON tags FOR ALL USING (auth.uid() = user_id);

-- ITEM_TAGS: access via item ownership
CREATE POLICY item_tags_all ON item_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = item_tags.item_id AND items.user_id = auth.uid()));
```

---

## 2. AI Integration Architecture

### 2.1 Vision API Comparison

| Factor | GPT-4o Vision | Claude 3.5 Sonnet | Gemini 1.5 Flash |
|--------|--------------|-------------------|-------------------|
| **Cost (per image ~500 tokens out)** | ~$0.01-0.02 | ~$0.01-0.02 | ~$0.001-0.003 |
| **Object identification** | Excellent | Excellent | Good |
| **Value estimation** | Good | Good | Fair |
| **Structured JSON output** | Excellent (native JSON mode) | Good | Good |
| **Speed** | ~2-4s | ~3-5s | ~1-2s |
| **UK market awareness** | Strong | Strong | Moderate |

**Recommendation: Google Gemini 1.5 Flash** as primary, with GPT-4o as fallback.

**Rationale:** At ~10x cheaper per call, Gemini Flash is the right choice for a consumer app where users photograph dozens of items per session. Object identification accuracy is sufficient — we're identifying "IKEA KALLAX shelf" not performing medical imaging. The cost savings allow more generous free tiers. Use GPT-4o as fallback for when Flash returns low-confidence results, or for a "detailed valuation" premium feature.

### 2.2 AI System Prompt

```
You are a household item identification and valuation expert for the UK market.

Given a photo of a household item, analyse it and return a JSON object with the following fields:

{
  "name": "Specific item name including brand/model if identifiable",
  "category": "One of: Electronics, Furniture, Kitchen & Dining, Clothing, Books & Media, Tools & DIY, Garden, Sports & Leisure, Art & Decor, Appliances, Toys & Games, Jewellery & Watches, Musical Instruments, Other",
  "brand": "Brand name if identifiable, or null",
  "model": "Model name/number if identifiable, or null",
  "description": "Brief factual description (1-2 sentences). Include material, colour, notable features.",
  "condition": "One of: new, like_new, good, fair, poor, broken — based on visible wear",
  "estimated_value_low_gbp": <number — conservative second-hand value in GBP>,
  "estimated_value_high_gbp": <number — optimistic second-hand value in GBP>,
  "confidence": <number 0.0-1.0 — how confident you are in identification>,
  "value_basis": "Brief explanation of valuation (e.g. 'Based on typical eBay UK sold prices for this model')",
  "suggested_tags": ["tag1", "tag2"]
}

Guidelines:
- Values should reflect realistic UK second-hand market prices (eBay, Facebook Marketplace, Gumtree).
- For new-looking items, value at 50-70% of retail. For used, 20-50%.
- If you cannot identify the specific item, describe it generically and give a wide value range.
- Set confidence below 0.5 if the image is blurry, obscured, or ambiguous.
- Always return valid JSON. No markdown, no explanation outside the JSON.
```

### 2.3 Edge Function: `identify-item`

```typescript
// supabase/functions/identify-item/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a household item identification and valuation expert for the UK market...`; // full prompt from above

interface IdentifyRequest {
  image_base64: string;      // base64-encoded image
  mime_type: string;          // image/jpeg or image/webp
}

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  try {
    // Auth check
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Rate limiting: check AI credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_credits_used, ai_credits_limit, ai_credits_reset_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
    }

    // Reset credits if new month
    const now = new Date();
    if (new Date(profile.ai_credits_reset_at) <= now) {
      await supabase
        .from("profiles")
        .update({
          ai_credits_used: 0,
          ai_credits_reset_at: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
        })
        .eq("id", user.id);
      profile.ai_credits_used = 0;
    }

    if (profile.ai_credits_used >= profile.ai_credits_limit) {
      return new Response(
        JSON.stringify({ error: "Monthly AI credit limit reached", credits_used: profile.ai_credits_used }),
        { status: 429 }
      );
    }

    // Parse request
    const { image_base64, mime_type }: IdentifyRequest = await req.json();

    if (!image_base64 || !mime_type) {
      return new Response(JSON.stringify({ error: "image_base64 and mime_type required" }), { status: 400 });
    }

    // Call Gemini
    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type, data: image_base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return new Response(JSON.stringify({ error: "No AI response" }), { status: 502 });
    }

    const result = JSON.parse(resultText);

    // Increment credits
    await supabase.rpc("increment_ai_credits", { user_id_param: user.id });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
```

```sql
-- RPC for atomic credit increment
CREATE OR REPLACE FUNCTION increment_ai_credits(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET ai_credits_used = ai_credits_used + 1 WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.4 Rate Limiting & Cost Management

| Tier | Monthly AI Credits | Est. Cost/User |
|------|-------------------|----------------|
| Free | 50 identifications | ~£0.10 |
| Paid | 500 identifications | ~£1.00 |

- Credits reset on 1st of each month (tracked in `profiles`)
- Edge Function enforces limit before calling API
- Client shows remaining credits in UI
- Background: At Gemini Flash pricing (~$0.002/call), 1000 users × 50 calls = $100/month

---

## 3. Storage Architecture

### 3.1 Bucket Configuration

```sql
-- Create storage bucket (via Supabase dashboard or migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-photos',
  'item-photos',
  FALSE,  -- private, accessed via signed URLs
  5242880,  -- 5MB max per file
  ARRAY['image/jpeg', 'image/webp', 'image/png']
);
```

**Storage policies:**

```sql
-- Users can upload to their own folder
CREATE POLICY storage_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
CREATE POLICY storage_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
CREATE POLICY storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3.2 Image Upload Flow

```
Path format: {user_id}/{item_id}/{uuid}.webp
Thumbnail:   {user_id}/{item_id}/{uuid}_thumb.webp
```

**Client-side flow (recommended over Edge Function for thumbnails):**

```typescript
// Client-side upload with compression
async function uploadItemPhoto(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  file: File
): Promise<{ storagePath: string; thumbnailPath: string }> {
  const photoId = crypto.randomUUID();

  // Compress original to max 1920px wide, 0.8 quality WebP
  const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.8, format: 'webp' });
  const storagePath = `${userId}/${itemId}/${photoId}.webp`;

  // Generate thumbnail client-side (400px wide)
  const thumb = await compressImage(file, { maxWidth: 400, quality: 0.6, format: 'webp' });
  const thumbnailPath = `${userId}/${itemId}/${photoId}_thumb.webp`;

  // Upload both
  await Promise.all([
    supabase.storage.from('item-photos').upload(storagePath, compressed),
    supabase.storage.from('item-photos').upload(thumbnailPath, thumb),
  ]);

  return { storagePath, thumbnailPath };
}
```

**Why client-side thumbnails:** Avoids an Edge Function invocation per photo (cost + latency). Modern browsers handle canvas resizing well. The only downside is slightly inconsistent thumbnails across devices — acceptable for this use case.

### 3.3 Supabase Image Transformation (Alternative)

Supabase has built-in image transforms via URL params. If the bucket is on Pro plan:

```
/storage/v1/render/image/public/item-photos/path.webp?width=400&quality=60
```

This removes the need for storing separate thumbnails entirely. **Use this if on Pro plan**, fall back to client-side thumbnails on Free plan.

---

## 4. Offline Sync Strategy

### 4.1 Architecture Overview

The PWA must work offline for the core flow: photograph → identify → save. Full sync happens when connectivity returns.

**Local storage:** IndexedDB via [Dexie.js](https://dexie.org/) (wrapper around IndexedDB with good offline-first patterns).

### 4.2 What to Cache Locally

| Data | Cache Strategy | Size Estimate |
|------|---------------|---------------|
| User profile | Cache on login, refresh on sync | <1KB |
| Properties & locations | Full local copy | <10KB |
| Categories | Full local copy | <5KB |
| Items (metadata) | Full local copy | ~100B/item × 1000 = 100KB |
| Item thumbnails | Cache recent 100, LRU evict | ~50KB × 100 = 5MB |
| Tags | Full local copy | <5KB |
| Pending uploads (full photos) | Queue until online | varies |

### 4.3 Offline Item Creation

```typescript
// Local-first item creation
interface PendingItem {
  client_id: string;           // UUID generated client-side
  name: string;
  description?: string;
  category_id?: string;
  location_id?: string;
  condition?: string;
  estimated_value_low?: number;
  estimated_value_high?: number;
  photos: Blob[];              // raw photos to upload
  ai_pending: boolean;         // needs AI identification when online
  created_at: string;
  synced: boolean;
}

async function createItemOffline(item: Omit<PendingItem, 'client_id' | 'synced'>) {
  const pendingItem: PendingItem = {
    ...item,
    client_id: crypto.randomUUID(),
    synced: false,
  };

  // Save to IndexedDB
  await db.pendingItems.add(pendingItem);

  // If online, sync immediately
  if (navigator.onLine) {
    await syncPendingItems();
  }
}
```

### 4.4 Sync Flow

```typescript
async function syncPendingItems() {
  const pending = await db.pendingItems.where('synced').equals(false).toArray();

  for (const item of pending) {
    try {
      // 1. Upload photos
      const photoPaths = await Promise.all(
        item.photos.map(photo => uploadItemPhoto(supabase, userId, item.client_id, photo))
      );

      // 2. If AI identification needed and not done, call Edge Function
      let aiResult = null;
      if (item.ai_pending && item.photos.length > 0) {
        const base64 = await blobToBase64(item.photos[0]);
        aiResult = await supabase.functions.invoke('identify-item', {
          body: { image_base64: base64, mime_type: 'image/webp' },
        });
      }

      // 3. Upsert item to Supabase (client_id handles dedup)
      const { data, error } = await supabase
        .from('items')
        .upsert({
          client_id: item.client_id,
          user_id: userId,
          name: aiResult?.data?.name ?? item.name ?? 'Unidentified Item',
          description: aiResult?.data?.description ?? item.description,
          category_id: await resolveCategoryId(aiResult?.data?.category),
          location_id: item.location_id,
          condition: aiResult?.data?.condition ?? item.condition,
          estimated_value_low: aiResult?.data?.estimated_value_low_gbp ?? item.estimated_value_low,
          estimated_value_high: aiResult?.data?.estimated_value_high_gbp ?? item.estimated_value_high,
          ai_identified: !!aiResult?.data,
          ai_raw_response: aiResult?.data,
        }, { onConflict: 'user_id,client_id' });

      // 4. Insert photo records
      if (data) {
        await Promise.all(photoPaths.map((p, i) =>
          supabase.from('item_photos').insert({
            item_id: data.id,
            storage_path: p.storagePath,
            thumbnail_path: p.thumbnailPath,
            is_primary: i === 0,
            sort_order: i,
          })
        ));
      }

      // 5. Mark synced locally
      await db.pendingItems.update(item.client_id, { synced: true });
    } catch (err) {
      console.error(`Failed to sync item ${item.client_id}:`, err);
      // Will retry on next sync
    }
  }
}

// Trigger sync on reconnect
window.addEventListener('online', syncPendingItems);
```

### 4.5 Conflict Resolution

**Strategy: Last-write-wins with client_id dedup.**

- The `client_id` + `UNIQUE INDEX` prevents duplicate items from offline retries
- `updated_at` is server-managed — if two edits conflict, the last one to reach the server wins
- For this app, conflicts are rare (single user, single device typical). If multi-device becomes important, switch to CRDT or operational transform — overkill for v1.

---

## 5. API Design

### 5.1 Direct Table Queries (via Supabase Client)

The frontend uses `supabase.from('table')` for standard CRUD. RLS handles authorization. No custom endpoints needed for basic operations.

```typescript
// Examples of key queries the frontend will use:

// Get all items with photos and tags for a property
const { data: items } = await supabase
  .from('items')
  .select(`
    *,
    category:categories(name, icon),
    location:locations(name, property_id, parent:locations(name)),
    photos:item_photos(id, storage_path, thumbnail_path, is_primary),
    tags:item_tags(tag:tags(id, name, color))
  `)
  .eq('is_archived', false)
  .order('created_at', { ascending: false });

// Get items by location
const { data } = await supabase
  .from('items')
  .select('*, photos:item_photos(thumbnail_path)')
  .eq('location_id', locationId)
  .eq('is_archived', false);

// Search items by name (fuzzy)
const { data } = await supabase
  .from('items')
  .select('*, photos:item_photos(thumbnail_path)')
  .ilike('name', `%${query}%`)
  .eq('is_archived', false)
  .limit(20);

// Get location tree for a property
const { data: locations } = await supabase
  .from('locations')
  .select('*, children:locations(id, name, icon, sort_order)')
  .eq('property_id', propertyId)
  .is('parent_id', null)
  .order('sort_order');
```

### 5.2 RPC Functions

```sql
-- Dashboard summary stats
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_items', COUNT(*) FILTER (WHERE NOT is_archived),
    'total_value_low', COALESCE(SUM(estimated_value_low * quantity) FILTER (WHERE NOT is_archived), 0),
    'total_value_high', COALESCE(SUM(estimated_value_high * quantity) FILTER (WHERE NOT is_archived), 0),
    'items_by_category', (
      SELECT json_agg(json_build_object('category', c.name, 'icon', c.icon, 'count', cnt))
      FROM (
        SELECT category_id, COUNT(*) as cnt
        FROM items WHERE user_id = auth.uid() AND NOT is_archived
        GROUP BY category_id
      ) sub
      JOIN categories c ON c.id = sub.category_id
    ),
    'items_by_property', (
      SELECT json_agg(json_build_object('property', p.name, 'count', cnt))
      FROM (
        SELECT l.property_id, COUNT(*) as cnt
        FROM items i JOIN locations l ON i.location_id = l.id
        WHERE i.user_id = auth.uid() AND NOT i.is_archived
        GROUP BY l.property_id
      ) sub
      JOIN properties p ON p.id = sub.property_id
    ),
    'recently_added', (
      SELECT json_agg(json_build_object('id', id, 'name', name, 'created_at', created_at))
      FROM (
        SELECT id, name, created_at FROM items
        WHERE user_id = auth.uid() AND NOT is_archived
        ORDER BY created_at DESC LIMIT 5
      ) sub
    ),
    'ai_credits_remaining', (
      SELECT ai_credits_limit - ai_credits_used FROM profiles WHERE id = auth.uid()
    )
  )
  FROM items WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Bulk move items to a new location
CREATE OR REPLACE FUNCTION move_items(item_ids UUID[], new_location_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE items SET location_id = new_location_id
  WHERE id = ANY(item_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk archive items
CREATE OR REPLACE FUNCTION archive_items(item_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE items SET is_archived = TRUE
  WHERE id = ANY(item_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Export inventory as JSON (for insurance purposes)
CREATE OR REPLACE FUNCTION export_inventory(property_id_param UUID DEFAULT NULL)
RETURNS JSON AS $$
  SELECT json_agg(item_data)
  FROM (
    SELECT json_build_object(
      'name', i.name,
      'description', i.description,
      'brand', i.brand,
      'model', i.model,
      'category', c.name,
      'location', l.name,
      'condition', i.condition,
      'estimated_value_low', i.estimated_value_low,
      'estimated_value_high', i.estimated_value_high,
      'purchase_price', i.purchase_price,
      'purchase_date', i.purchase_date,
      'quantity', i.quantity,
      'notes', i.notes
    ) as item_data
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations l ON i.location_id = l.id
    WHERE i.user_id = auth.uid()
      AND NOT i.is_archived
      AND (property_id_param IS NULL OR l.property_id = property_id_param)
    ORDER BY c.name, i.name
  ) sub;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 5.3 Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `identify-item` | POST | AI image identification (see §2.3) |
| `delete-account` | POST | GDPR: delete all user data + storage files |

---

## 6. Security

### 6.1 Auth Flow

**Provider:** Supabase Auth with:
- **Email/password** (primary)
- **Google OAuth** (convenience)
- **Magic link** (passwordless option)

```typescript
// PWA auth configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,          // persist in localStorage
    autoRefreshToken: true,
    detectSessionInUrl: true,       // for OAuth redirects
    storage: localStorage,          // works offline
    flowType: 'pkce',              // PKCE flow for PWA security
  },
});
```

### 6.2 RLS Summary

All data access is gated by `auth.uid()`:

| Table | Policy Logic |
|-------|-------------|
| `profiles` | `id = auth.uid()` |
| `properties` | `user_id = auth.uid()` |
| `locations` | via `properties.user_id = auth.uid()` |
| `categories` | `user_id IS NULL OR user_id = auth.uid()` |
| `items` | `user_id = auth.uid()` |
| `item_photos` | via `items.user_id = auth.uid()` |
| `tags` | `user_id = auth.uid()` |
| `item_tags` | via `items.user_id = auth.uid()` |
| `storage` | folder prefix = `auth.uid()` |

### 6.3 Edge Function Security

- All Edge Functions validate `Authorization` header via `supabase.auth.getUser()`
- AI endpoint enforces per-user rate limits
- CORS restricted to app domain in production
- API keys (Gemini, etc.) stored as Supabase secrets, never exposed to client

### 6.4 Additional Measures

- **Input validation:** All user inputs sanitized; item names limited to 200 chars, descriptions to 2000
- **Image validation:** Only JPEG/WebP/PNG accepted, max 5MB, validated server-side by storage bucket config
- **GDPR:** `delete-account` Edge Function removes all data across tables + storage
- **No service role key on client** — always use anon key + RLS

---

## 7. Migration Order

Run in this order to respect foreign key dependencies:

1. Extensions & types
2. `profiles` + auth trigger
3. `properties`
4. `profiles` FK to properties
5. `locations`
6. `categories` + seed data
7. `items`
8. `item_photos`
9. `tags` + `item_tags`
10. `updated_at` triggers
11. RLS policies
12. RPC functions
13. Storage bucket + policies

---

## 8. Cost Estimates (Monthly)

| Component | Free Tier | With 1K Users |
|-----------|-----------|---------------|
| Supabase (Pro) | $25 | $25 |
| Database | included | included (up to 8GB) |
| Storage | 1GB free | ~$0.02/GB ($2 for 100GB) |
| Edge Functions | 500K free | included |
| Gemini Flash API | — | ~$100 (50K calls) |
| **Total** | **$25** | **~$130** |
