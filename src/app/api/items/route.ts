import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

// Use service role for server-side operations (no auth needed for v1 personal app)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

// Default user ID for v1 (single-user, no auth)
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      brand,
      condition,
      estimatedValueLow,
      estimatedValueHigh,
      tags,
      photoBase64,
      aiRawResponse,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Ensure default user exists in profiles
    await supabase
      .from("profiles")
      .upsert({ id: DEFAULT_USER_ID, display_name: "George" }, { onConflict: "id" });

    // Look up category ID
    let categoryId = null;
    if (category) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .or(`name.eq.${category},name.ilike.%${category}%`)
        .limit(1)
        .single();
      categoryId = catData?.id || null;
    }

    // Insert item
    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert({
        user_id: DEFAULT_USER_ID,
        name,
        description: description || null,
        brand: brand || null,
        condition: condition || "good",
        estimated_value_low: estimatedValueLow || null,
        estimated_value_high: estimatedValueHigh || null,
        category_id: categoryId,
        ai_identified: true,
        ai_raw_response: aiRawResponse || null,
        client_id: crypto.randomUUID(),
      })
      .select()
      .single();

    if (itemError) {
      console.error("Insert error:", itemError);
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // Upload photo if provided
    let photoUrl = null;
    if (photoBase64 && item) {
      const buffer = Buffer.from(photoBase64, "base64");
      const path = `${DEFAULT_USER_ID}/${item.id}/${crypto.randomUUID()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(path, buffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (!uploadError) {
        // Save photo record
        await supabase.from("item_photos").insert({
          item_id: item.id,
          storage_path: path,
          is_primary: true,
          size_bytes: buffer.length,
        });

        const { data: urlData } = supabase.storage
          .from("item-photos")
          .getPublicUrl(path);
        photoUrl = urlData?.publicUrl;
      } else {
        console.error("Upload error:", uploadError);
      }
    }

    // Save tags
    if (tags && tags.length > 0 && item) {
      for (const tagName of tags) {
        // Upsert tag
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name: tagName.toLowerCase() }, { onConflict: "name" })
          .select("id")
          .single();

        if (tag) {
          await supabase
            .from("item_tags")
            .insert({ item_id: item.id, tag_id: tag.id })
            .single();
        }
      }
    }

    return NextResponse.json({ item, photoUrl });
  } catch (err) {
    console.error("Items API error:", err);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: items, error } = await supabase
      .from("items")
      .select(`
        *,
        categories(name, icon),
        item_photos(storage_path, is_primary)
      `)
      .eq("user_id", DEFAULT_USER_ID)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary
    const { data: summary } = await supabase
      .rpc("get_inventory_summary", { p_user_id: DEFAULT_USER_ID });

    return NextResponse.json({ items: items || [], summary });
  } catch (err) {
    console.error("Items GET error:", err);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
