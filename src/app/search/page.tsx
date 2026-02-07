"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, SlidersHorizontal, MapPin, Package } from "lucide-react";
import { ItemGridSkeleton } from "@/components/skeletons";

const filterChips = ["All", "Electronics", "Furniture", "Tools", "Kitchen", "Books", "Clothing"];

const mockResults = [
  { id: "1", name: "iPhone USB-C Charger", location: "Bedroom > Desk > Top drawer", category: "Electronics", value: 19 },
  { id: "2", name: "MacBook Charger", location: "Office > Desk", category: "Electronics", value: 79 },
  { id: "3", name: "DeWalt Battery Charger", location: "Garage > Workbench", category: "Tools", value: 35 },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading] = useState(false);

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

      {/* Results */}
      {isLoading ? (
        <ItemGridSkeleton count={4} />
      ) : query ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{mockResults.length} results</p>
          {mockResults.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex gap-3">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">£{item.value}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="pt-16 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Search your inventory</p>
          <p className="text-xs mt-1">Find items by name, category, or location</p>
        </div>
      )}
    </div>
  );
}
