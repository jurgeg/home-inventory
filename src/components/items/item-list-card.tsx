"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface ItemListCardProps {
  id: string;
  name: string;
  brand?: string | null;
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  photoUrl?: string | null;
  createdAt?: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ItemListCard({
  id,
  name,
  brand,
  estimatedValueLow,
  estimatedValueHigh,
  categoryName,
  categoryIcon,
  photoUrl,
  createdAt,
}: ItemListCardProps) {
  return (
    <Link href={`/items/${id}`}>
      <Card className="hover:shadow-md active:scale-[0.98] transition-all duration-150 rounded-xl">
        <CardContent className="p-3 flex gap-3 items-center">
          {/* Thumbnail or icon fallback */}
          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-lg">{categoryIcon || "📦"}</span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            {brand && (
              <p className="text-xs text-muted-foreground truncate">{brand}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {categoryName && (
                <span className="text-[10px] bg-[#4A6FA5]/10 text-[#4A6FA5] px-2 py-0.5 rounded-full font-medium">
                  {categoryName}
                </span>
              )}
              {(estimatedValueLow != null || estimatedValueHigh != null) && (
                <span className="text-xs text-muted-foreground">
                  £{estimatedValueLow || 0}–£{estimatedValueHigh || 0}
                </span>
              )}
              {createdAt && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {timeAgo(createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
