"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, SlidersHorizontal, Package, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPhotoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/item-photos/${path}`;
}

interface Item {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  condition: string;
  created_at: string;
  categories: { name: string; icon: string } | null;
  item_photos: { storage_path: string; is_primary: boolean }[];
}

const filterChips = [
  "All",
  "Electronics",
  "Furniture",
  "Kitchen & Dining",
  "Appliances",
  "Tools & DIY",
  "Clothing",
  "Books & Media",
  "Sports & Leisure",
  "Art & Decor",
  "Other",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(initialCategory);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all items on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setAllItems(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter items by query and category
  const filtered = allItems.filter((item) => {
    const matchesQuery =
      !query.trim() ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(query.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory =
      activeFilter === "All" || item.categories?.name === activeFilter;

    return matchesQuery && matchesCategory;
  });

  // Count items per category for the badges
  const categoryCounts = allItems.reduce<Record<string, number>>((acc, item) => {
    const cat = item.categories?.name || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="px-4 pt-12 safe-area-pt space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Where is my...?"
          className="pl-9 pr-10 h-11 bg-card rounded-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Category filter chips with counts */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {filterChips.map((chip) => {
          const count = chip === "All" ? allItems.length : (categoryCounts[chip] || 0);
          if (chip !== "All" && count === 0) return null;
          return (
            <Badge
              key={chip}
              variant={activeFilter === chip ? "default" : "secondary"}
              className="cursor-pointer shrink-0 px-3 py-1.5 text-xs gap-1"
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
              <span className="opacity-60">({count})</span>
            </Badge>
          );
        })}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
          {query && ` matching "${query}"`}
          {activeFilter !== "All" && ` in ${activeFilter}`}
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className="pt-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
          <p className="text-sm">Loading inventory...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((item) => {
            const primaryPhoto = item.item_photos?.find((p) => p.is_primary) || item.item_photos?.[0];
            return (
            <Link key={item.id} href={`/items/${item.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
                <CardContent className="p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg overflow-hidden">
                    {primaryPhoto ? (
                      <img src={getPhotoUrl(primaryPhoto.storage_path)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      item.categories?.icon || "📦"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.brand && (
                        <span className="text-xs text-muted-foreground">{item.brand}</span>
                      )}
                      <span className="text-xs font-medium text-primary">
                        £{item.estimated_value_low || 0}–£{item.estimated_value_high || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.categories && (
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                          {item.categories.name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )})}
        </div>
      ) : allItems.length === 0 ? (
        <div className="pt-16 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No items yet</p>
          <p className="text-xs mt-1">Add items using the camera button below</p>
        </div>
      ) : (
        <div className="pt-16 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No matches</p>
          <p className="text-xs mt-1">Try a different search or category</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-12 safe-area-pt"><h1 className="text-2xl font-bold">Search</h1></div>}>
      <SearchContent />
    </Suspense>
  );
}
