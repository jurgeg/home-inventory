import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/navigation/bottom-nav";

export const metadata: Metadata = {
  title: "Home Inventory",
  description: "AI-powered home inventory tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inventory",
  },
};

export const viewport: Viewport = {
  themeColor: "#4A6FA5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        <main className="pb-20 min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
