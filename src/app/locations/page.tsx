import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";

const mockProperties = [
  {
    id: "1",
    name: "Home",
    icon: "🏠",
    roomCount: 8,
    itemCount: 187,
    rooms: [
      { name: "Living Room", icon: "🛋️", itemCount: 12 },
      { name: "Kitchen", icon: "🍳", itemCount: 8 },
      { name: "Bedroom", icon: "🛏️", itemCount: 15 },
      { name: "Garage", icon: "🚗", itemCount: 6 },
      { name: "Bathroom", icon: "🛁", itemCount: 3 },
    ],
  },
  {
    id: "2",
    name: "Office",
    icon: "🏢",
    roomCount: 3,
    itemCount: 42,
    rooms: [
      { name: "Main Office", icon: "💻", itemCount: 22 },
      { name: "Meeting Room", icon: "📋", itemCount: 12 },
      { name: "Kitchen", icon: "☕", itemCount: 8 },
    ],
  },
];

export default function LocationsPage() {
  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      <h1 className="text-2xl font-bold">Locations</h1>

      <div className="space-y-4">
        {mockProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Property header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{property.icon}</span>
                  <div>
                    <p className="font-semibold">{property.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.roomCount} rooms · {property.itemCount} items
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Room chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {property.rooms.map((room) => (
                  <Badge
                    key={room.name}
                    variant="secondary"
                    className="shrink-0 px-3 py-2 cursor-pointer hover:bg-secondary/80 text-xs gap-1"
                  >
                    <span>{room.icon}</span>
                    <span className="font-medium">{room.itemCount}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add property */}
        <Button variant="outline" className="w-full h-14 border-dashed">
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>
    </div>
  );
}
