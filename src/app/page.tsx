import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Package, MapPin, Tag, Camera } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Home Inventory</h1>
        <p className="text-sm text-muted-foreground">Track everything you own</p>
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
          <p className="text-3xl font-bold mt-1">£0</p>
          <p className="text-xs opacity-70 mt-1">Add items to start tracking</p>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Package, label: "Items", value: "0" },
          { icon: MapPin, label: "Rooms", value: "0" },
          { icon: Tag, label: "Categories", value: "0" },
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

      {/* Empty state - get started */}
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
    </div>
  );
}
