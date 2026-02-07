import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: item, error } = await supabase
      .from("items")
      .select(`
        *,
        categories(id, name, icon),
        item_photos(storage_path, is_primary),
        item_tags(tags(id, name))
      `)
      .eq("id", id)
      .eq("user_id", DEFAULT_USER_ID)
      .eq("is_archived", false)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Item GET error:", err);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.condition !== undefined) updates.condition = body.condition;
    if (body.estimatedValueLow !== undefined) updates.estimated_value_low = body.estimatedValueLow;
    if (body.estimatedValueHigh !== undefined) updates.estimated_value_high = body.estimatedValueHigh;

    if (body.category !== undefined) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .or(`name.eq.${body.category},name.ilike.%${body.category}%`)
        .limit(1)
        .single();
      updates.category_id = catData?.id || null;
    }

    const { data: item, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", id)
      .eq("user_id", DEFAULT_USER_ID)
      .select(`*, categories(id, name, icon), item_photos(storage_path, is_primary)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Item PATCH error:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from("items")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("user_id", DEFAULT_USER_ID);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Item DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
