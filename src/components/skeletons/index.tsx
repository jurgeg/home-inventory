import { Card } from "@/components/ui/card";

export function ItemCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square animate-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 animate-shimmer rounded w-3/4" />
        <div className="h-3 animate-shimmer rounded w-1/2" />
        <div className="h-3 animate-shimmer rounded w-1/4" />
      </div>
    </Card>
  );
}

export function ItemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ValueCardSkeleton() {
  return (
    <Card className="p-6 space-y-3">
      <div className="h-4 animate-shimmer rounded w-24" />
      <div className="h-8 animate-shimmer rounded w-36" />
      <div className="h-3 animate-shimmer rounded w-28" />
    </Card>
  );
}

export function SearchBarSkeleton() {
  return <div className="h-11 animate-shimmer rounded-lg" />;
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <div className="w-10 h-10 animate-shimmer rounded-full" />
          <div className="h-4 animate-shimmer rounded w-20" />
          <div className="h-3 animate-shimmer rounded w-10" />
        </Card>
      ))}
    </div>
  );
}

export function LocationCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="h-5 animate-shimmer rounded w-32" />
      <div className="h-3 animate-shimmer rounded w-40" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-16 animate-shimmer rounded" />
        ))}
      </div>
    </Card>
  );
}

export function SettingsListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 animate-shimmer rounded" />
            <div className="h-4 animate-shimmer rounded w-32" />
          </div>
          <div className="h-4 w-4 animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}
