"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  MapPin,
  Settings,
  Camera,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "__fab__", icon: Camera, label: "Add" },
  { href: "/categories", icon: LayoutGrid, label: "Categories" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          if (tab.href === "__fab__") {
            return (
              <Link
                key="fab"
                href="/capture"
                className="flex items-center justify-center -mt-6 w-16 h-16 rounded-full bg-[#4A6FA5] text-white shadow-xl shadow-[#4A6FA5]/30 active:scale-90 transition-transform duration-150"
              >
                <Camera className="w-7 h-7" />
              </Link>
            );
          }

          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-2 transition-all duration-150 active:scale-90",
                isActive
                  ? "text-[#4A6FA5]"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn("w-5 h-5 transition-all", isActive && "w-[22px] h-[22px]")}
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={cn(
                  "text-[10px] transition-all",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#4A6FA5] -mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
