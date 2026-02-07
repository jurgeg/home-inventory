"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, SlidersHorizontal, Package, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Item {
  id: string;
  name: string;
  brand: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  condition: string;
  categories: { name: string; icon: string } | null;
}

const filterChips = ["All", "Electronics", "Furniture", "Tools", "Kitchen", "Books", "Clothing"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/items?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const filtered =
    activeFilter === "All"
      ? results
      : results.filter((i) => i.categories?.name === activeFilter);

  return (
    <div className="px-4 pt-12 safe-area-pt space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Where is my...?"
          className="pl-9 pr-10 h-11 bg-card rounded-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {filterChips.map((chip) => (
          <Badge
            key={chip}
            variant={activeFilter === chip ? "default" : "secondary"}
            className="cursor-pointer shrink-0 px-3 py-1.5 text-xs"
            onClick={() => setActiveFilter(chip)}
          >
            {chip}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="pt-8 text-center text-muted-foreground text-sm">Searching...</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link key={item.id} href={`/items/${item.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
                    {item.categories?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.categories && (
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                          {item.categories.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        £{item.estimated_value_low || 0}–£{item.estimated_value_high || 0}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : searched ? (
        <div className="pt-16 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No items found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="pt-16 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Search your inventory</p>
          <p className="text-xs mt-1">Type to find items by name</p>
        </div>
      )}
    </div>
  );
}
