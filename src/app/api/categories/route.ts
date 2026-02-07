import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const supabase = getSupabase();

    // Get all items with their categories
    const { data: items, error } = await supabase
      .from("items")
      .select("category_id, estimated_value_low, estimated_value_high, categories(id, name, icon)")
      .eq("user_id", DEFAULT_USER_ID)
      .eq("is_archived", false)
      .not("category_id", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by category
    const categoryMap = new Map<
      string,
      { id: string; name: string; icon: string; itemCount: number; totalValue: number }
    >();

    for (const item of items || []) {
      const cat = item.categories as unknown as { id: string; name: string; icon: string } | null;
      if (!cat) continue;

      const existing = categoryMap.get(cat.id);
      const avgValue = Math.round(
        ((item.estimated_value_low || 0) + (item.estimated_value_high || 0)) / 2
      );

      if (existing) {
        existing.itemCount++;
        existing.totalValue += avgValue;
      } else {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon || "📦",
          itemCount: 1,
          totalValue: avgValue,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => b.itemCount - a.itemCount
    );

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("Categories GET error:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
