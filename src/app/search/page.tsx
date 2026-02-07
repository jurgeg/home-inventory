"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Package } from "lucide-react";

const filterChips = ["All", "Electronics", "Furniture", "Tools", "Kitchen", "Books", "Clothing"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="px-4 pt-12 safe-area-pt space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>

      {/* Search input */}
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

      {/* Filter chips */}
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

      {/* Empty state */}
      <div className="pt-16 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No items yet</p>
        <p className="text-xs mt-1">Add items to your inventory to search them</p>
      </div>
    </div>
  );
}
