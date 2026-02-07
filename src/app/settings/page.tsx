import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, User, Users, Tag, Coins, Download, Bell, Info, LogOut } from "lucide-react";

const settingsGroups = [
  {
    items: [
      { icon: User, label: "Account", detail: "george@email.com" },
      { icon: Users, label: "Household", detail: "2 members" },
    ],
  },
  {
    items: [
      { icon: Tag, label: "Categories", detail: "Manage custom categories" },
      { icon: Coins, label: "Currency", detail: "GBP (£)" },
    ],
  },
  {
    items: [
      { icon: Download, label: "Export Data", detail: "CSV, PDF, or JSON" },
      { icon: Bell, label: "Notifications", detail: "Warranty reminders" },
    ],
  },
  {
    items: [
      { icon: Info, label: "About", detail: "Version 1.0.0" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        {settingsGroups.map((group, gi) => (
          <Card key={gi}>
            <CardContent className="p-0 divide-y divide-border">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Sign out */}
        <button className="w-full flex items-center justify-center gap-2 p-4 text-destructive text-sm font-medium">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
