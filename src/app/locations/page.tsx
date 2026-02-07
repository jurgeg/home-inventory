import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin } from "lucide-react";

export default function LocationsPage() {
  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      <h1 className="text-2xl font-bold">Locations</h1>

      {/* Empty state */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">No Locations Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first property and organise rooms to track where everything lives.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
