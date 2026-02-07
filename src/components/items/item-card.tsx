import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package } from "lucide-react";
import type { Item } from "@/types";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-muted">
        {item.thumbnailUrl || item.imageUrl ? (
          <img
            src={item.thumbnailUrl || item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
        {item.category && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px] bg-white/90 backdrop-blur-sm"
          >
            {item.category}
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-medium text-sm truncate">{item.name}</p>
        {item.roomName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {item.roomName}
            {item.spotName && ` · ${item.spotName}`}
          </p>
        )}
        {item.estimatedValue != null && (
          <p className="text-xs font-semibold text-primary">
            £{item.estimatedValue.toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
}
