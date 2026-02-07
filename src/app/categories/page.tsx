"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  totalValue: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-12 pb-24 safe-area-pt space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Browse your inventory by category
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-32" />
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <LayoutGrid className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No categories yet. Add items to see them organized here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/search?category=${encodeURIComponent(cat.name)}`}
            >
              <Card className="hover:shadow-md active:scale-[0.97] transition-all duration-150 rounded-xl h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">{cat.icon}</span>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat.itemCount} item{cat.itemCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs font-medium text-[#4A6FA5]">
                    £{cat.totalValue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
