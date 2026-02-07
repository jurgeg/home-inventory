-- 001_initial_schema.sql
-- Home Inventory PWA — Full schema, RLS, triggers, RPC, storage

-- ===========================================
-- 1. Extensions & Types
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE item_condition AS ENUM (
  'new', 'like_new', 'good', 'fair', 'poor', 'broken'
);

CREATE TYPE value_confidence AS ENUM (
  'ai_estimated', 'user_provided', 'verified'
);

-- ===========================================
-- 2. Profiles
-- ===========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  default_property_id UUID,
  ai_credits_used INT NOT NULL DEFAULT 0,
  ai_credits_limit INT NOT NULL DEFAULT 100,
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

-- ===========================================
-- 3. Properties
-- ===========================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  property_type TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_user ON properties(user_id);

-- 4. FK from profiles to properties
ALTER TABLE profiles
  ADD CONSTRAINT fk_default_property
  FOREIGN KEY (default_property_id) REFERENCES properties(id) ON DELETE SET NULL;

-- ===========================================
-- 5. Locations
-- ===========================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_deep_nesting CHECK (parent_id IS NULL OR parent_id != id)
);

CREATE INDEX idx_locations_property ON locations(property_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);

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

-- ===========================================
-- 6. Categories + Seed Data
-- ===========================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_categories_user ON categories(user_id);

INSERT INTO categories (id, user_id, name, icon) VALUES
  (gen_random_uuid(), NULL, 'Electronics', '💻'),
  (gen_random_uuid(), NULL, 'Furniture', '🪑'),
  (gen_random_uuid(), NULL, 'Kitchen & Dining', '🍳'),
  (gen_random_uuid(), NULL, 'Clothing', '👕'),
  (gen_random_uuid(), NULL, 'Books & Media', '📚'),
  (gen_random_uuid(), NULL, 'Tools & DIY', '🔧'),
  (gen_random_uuid(), NULL, 'Garden', '🌱'),
  (gen_random_uuid(), NULL, 'Sports & Leisure', '⚽'),
  (gen_random_uuid(), NULL, 'Art & Decor', '🖼️'),
  (gen_random_uuid(), NULL, 'Appliances', '🔌'),
  (gen_random_uuid(), NULL, 'Toys & Games', '🎮'),
  (gen_random_uuid(), NULL, 'Jewellery & Watches', '💍'),
  (gen_random_uuid(), NULL, 'Musical Instruments', '🎸'),
  (gen_random_uuid(), NULL, 'Other', '📦');

-- ===========================================
-- 7. Items
-- ===========================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  condition item_condition DEFAULT 'good',
  quantity INT NOT NULL DEFAULT 1,
  estimated_value_low NUMERIC(10,2),
  estimated_value_high NUMERIC(10,2),
  purchase_price NUMERIC(10,2),
  value_confidence value_confidence DEFAULT 'ai_estimated',
  purchase_date DATE,
  warranty_expires DATE,
  notes TEXT,
  ai_identified BOOLEAN NOT NULL DEFAULT FALSE,
  ai_raw_response JSONB,
  client_id TEXT,
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
CREATE UNIQUE INDEX idx_items_dedup ON items(user_id, client_id) WHERE client_id IS NOT NULL;

-- ===========================================
-- 8. Item Photos
-- ===========================================
CREATE TABLE item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  width INT,
  height INT,
  size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_item ON item_photos(item_id);
CREATE UNIQUE INDEX idx_photos_primary ON item_photos(item_id) WHERE is_primary = TRUE;

-- ===========================================
-- 9. Tags & Item Tags
-- ===========================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_item_tags_tag ON item_tags(tag_id);

-- ===========================================
-- 10. Updated_at Triggers
-- ===========================================
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

-- ===========================================
-- 11. Row Level Security
-- ===========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties
CREATE POLICY properties_all ON properties FOR ALL USING (auth.uid() = user_id);

-- Locations
CREATE POLICY locations_all ON locations FOR ALL
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = locations.property_id AND properties.user_id = auth.uid()));

-- Categories
CREATE POLICY categories_select ON categories FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (user_id = auth.uid());

-- Items
CREATE POLICY items_all ON items FOR ALL USING (auth.uid() = user_id);

-- Item Photos
CREATE POLICY photos_all ON item_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = item_photos.item_id AND items.user_id = auth.uid()));

-- Tags
CREATE POLICY tags_all ON tags FOR ALL USING (auth.uid() = user_id);

-- Item Tags
CREATE POLICY item_tags_all ON item_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = item_tags.item_id AND items.user_id = auth.uid()));

-- ===========================================
-- 12. RPC Functions
-- ===========================================
CREATE OR REPLACE FUNCTION increment_ai_credits(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET ai_credits_used = ai_credits_used + 1 WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION move_items(item_ids UUID[], new_location_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE items SET location_id = new_location_id
  WHERE id = ANY(item_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_items(item_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE items SET is_archived = TRUE
  WHERE id = ANY(item_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ===========================================
-- 13. Storage Bucket & Policies
-- ===========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-photos',
  'item-photos',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/webp', 'image/png']
);

CREATE POLICY storage_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
