import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Package, MapPin, Tag } from "lucide-react";

// Mock data for shell
const recentItems = [
  { id: "1", name: "iPad Pro", time: "2m ago", category: "Electronics" },
  { id: "2", name: "Desk Lamp", time: "1d ago", category: "Furniture" },
  { id: "3", name: "DeWalt Drill", time: "3d ago", category: "Tools" },
  { id: "4", name: "Vitamix", time: "5d ago", category: "Kitchen" },
];

const categories = [
  { name: "Electronics", count: 34, icon: "💻", color: "bg-blue-50 text-blue-700" },
  { name: "Furniture", count: 28, icon: "🪑", color: "bg-amber-50 text-amber-700" },
  { name: "Tools", count: 19, icon: "🔧", color: "bg-slate-50 text-slate-700" },
  { name: "Books", count: 45, icon: "📚", color: "bg-emerald-50 text-emerald-700" },
];

export default function DashboardPage() {
  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Hi, George</h1>
        <p className="text-sm text-muted-foreground">Saturday, 7 Feb</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Where is my...?"
          className="pl-9 h-11 bg-card border-border rounded-lg"
          readOnly
        />
      </div>

      {/* Total value card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <p className="text-sm opacity-80 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Total Value
          </p>
          <p className="text-3xl font-bold mt-1">£12,340</p>
          <p className="text-xs opacity-70 mt-1">+£240 this month</p>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Package, label: "Items", value: "247" },
          { icon: MapPin, label: "Rooms", value: "12" },
          { icon: Tag, label: "Categories", value: "8" },
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

      {/* Recently added */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recently Added</h2>
          <span className="text-xs text-primary font-medium">See all →</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {recentItems.map((item) => (
            <Card key={item.id} className="shrink-0 w-28 overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.time}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="font-semibold mb-3">Categories</h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Card key={cat.name} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${cat.color}`}>
                  {cat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.count} items</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
