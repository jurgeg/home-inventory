"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Package, MapPin, Tag, Camera } from "lucide-react";
import Link from "next/link";

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

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalValueLow = items.reduce((sum, i) => sum + (i.estimated_value_low || 0), 0);
  const totalValueHigh = items.reduce((sum, i) => sum + (i.estimated_value_high || 0), 0);
  const totalValue = Math.round((totalValueLow + totalValueHigh) / 2);
  const categoryCount = new Set(items.map((i) => i.categories?.name).filter(Boolean)).size;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
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
      <Card className="bg-primary text-primary-foreground">
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
          {/* Recently added */}
          <div>
            <h2 className="font-semibold mb-3">Recently Added</h2>
            <div className="space-y-3">
              {items.slice(0, 10).map((item) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
                      {item.categories?.icon || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {item.categories && (
                          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                            {item.categories.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          £{item.estimated_value_low || 0}–£{item.estimated_value_high || 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Snap a photo of any item and AI will identify it, estimate its value, and add it to your inventory.
            </p>
            <Link
              href="/capture"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium"
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
