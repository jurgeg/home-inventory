"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Package, MapPin, Tag, Camera, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ItemListCard } from "@/components/items/item-list-card";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPhotoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/item-photos/${path}`;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  condition: string;
  created_at: string;
  categories: { name: string; icon: string } | null;
  item_photos: { storage_path: string; is_primary: boolean }[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  totalValue: number;
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/items").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([itemsData, catsData]) => {
        setItems(itemsData.items || []);
        setCategories(catsData.categories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalValueLow = items.reduce((sum, i) => sum + (i.estimated_value_low || 0), 0);
  const totalValueHigh = items.reduce((sum, i) => sum + (i.estimated_value_high || 0), 0);
  const totalValue = Math.round((totalValueLow + totalValueHigh) / 2);
  const categoryCount = new Set(items.map((i) => i.categories?.name).filter(Boolean)).size;

  return (
    <div className="px-4 pt-12 pb-24 safe-area-pt space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Home Inventory</h1>
        <p className="text-sm text-muted-foreground">
          {items.length > 0 ? `${items.length} items tracked` : "Track everything you own"}
        </p>
      </div>

      {/* Search bar */}
      <Link href="/search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Where is my...?"
            className="pl-9 h-11 bg-card border-border rounded-lg"
            readOnly
          />
        </div>
      </Link>

      {/* Total value card */}
      <Card className="bg-[#4A6FA5] text-white">
        <CardContent className="p-5">
          <p className="text-sm opacity-80 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Total Value
          </p>
          <p className="text-3xl font-bold mt-1">
            {loading ? "..." : `£${totalValue.toLocaleString()}`}
          </p>
          <p className="text-xs opacity-70 mt-1">
            {items.length > 0
              ? `£${totalValueLow.toLocaleString()} – £${totalValueHigh.toLocaleString()} range`
              : "Add items to start tracking"}
          </p>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Package, label: "Items", value: loading ? "..." : items.length.toString() },
          { icon: MapPin, label: "Rooms", value: "0" },
          { icon: Tag, label: "Categories", value: loading ? "..." : categoryCount.toString() },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length > 0 ? (
        <>
          {/* Categories section */}
          {categories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Categories</h2>
                <Link
                  href="/categories"
                  className="text-xs text-[#4A6FA5] font-medium"
                >
                  See all →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/search?category=${encodeURIComponent(cat.name)}`}
                    className="shrink-0"
                  >
                    <Card className="hover:shadow-md active:scale-[0.97] transition-all duration-150 rounded-xl w-28">
                      <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                        <span className="text-2xl">{cat.icon}</span>
                        <p className="font-medium text-xs truncate w-full">{cat.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {cat.itemCount} item{cat.itemCount !== 1 ? "s" : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently added */}
          <div>
            <h2 className="font-semibold mb-3">Recently Added</h2>
            <div className="space-y-2">
              {items.slice(0, 10).map((item) => {
                const primaryPhoto = item.item_photos?.find((p) => p.is_primary) || item.item_photos?.[0];
                return (
                <ItemListCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  brand={item.brand}
                  estimatedValueLow={item.estimated_value_low}
                  estimatedValueHigh={item.estimated_value_high}
                  categoryName={item.categories?.name}
                  categoryIcon={item.categories?.icon}
                  photoUrl={primaryPhoto ? getPhotoUrl(primaryPhoto.storage_path) : null}
                  createdAt={item.created_at}
                />);
              })}
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#4A6FA5]/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-[#4A6FA5]" />
            </div>
            <h3 className="font-semibold mb-1">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Snap a photo of any item and AI will identify it, estimate its value, and add it to your inventory.
            </p>
            <Link
              href="/capture"
              className="inline-flex items-center gap-2 bg-[#4A6FA5] text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              Add Your First Item
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
