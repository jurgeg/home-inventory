"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MapPin, Settings, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "__fab__", icon: Camera, label: "Add" },
  { href: "/locations", icon: MapPin, label: "Locations" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-t border-border safe-area-pb">
      <div className="flex items-end justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          if (tab.href === "__fab__") {
            return (
              <Link
                key="fab"
                href="/capture"
                className="flex items-center justify-center -mt-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
              >
                <Camera className="w-6 h-6" />
              </Link>
            );
          }

          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
