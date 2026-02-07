# Home Inventory PWA — Frontend Technical Spec

## 1. Tech Stack Recommendations

### Core Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15 App Router** | SSR/SSG flexibility, file-based routing, React Server Components |
| PWA | **Serwist** (`@serwist/next`) | Active successor to next-pwa, Turbopack support, workbox-based |
| UI | **shadcn/ui + Tailwind CSS 4** | Copy-paste components, full control, tree-shakeable, great mobile UX |
| State (offline) | **Zustand + IndexedDB (Dexie.js)** | Lightweight, works offline, easy persistence |
| Sync | **Custom sync queue + TanStack Query** | TQ for server state/caching, custom queue for offline mutations |
| Charts | **Recharts** (or lightweight: Chart.js) | Good React integration, responsive |
| Image processing | **Browser Canvas API** | Client-side resize before upload, no extra deps |
| Camera | **Hybrid: `<input capture>` primary + `getUserMedia` enhanced** | See §3.1 |

### Why NOT alternatives
- **next-pwa**: Unmaintained since 2022. Serwist is the direct successor.
- **@ducanh2912/next-pwa**: Also by Serwist's author, deprecated in favor of Serwist.
- **TanStack Query offline alone**: Great for cache but doesn't handle IndexedDB persistence of images/blobs natively. Combine with Dexie.
- **Redux/MobX**: Overkill for this app size. Zustand is ~1KB.

---

## 2. PWA Configuration

### 2.1 Manifest (`app/manifest.ts`)

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Inventory",
    short_name: "Inventory",
    description: "Track and value your home belongings",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // iOS doesn't read manifest for splash — use apple-touch meta tags instead
  };
}
```

### 2.2 iOS-specific meta tags (`app/layout.tsx`)

```tsx
export const metadata: Metadata = {
  title: "Home Inventory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inventory",
    startupImage: [
      // Generate these with pwa-asset-generator
      { url: "/splash/apple-splash-1170-2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/apple-splash-1290-2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      // ... add all iPhone/iPad sizes
    ],
  },
};
```

### 2.3 Service Worker (`app/sw.ts`)

```typescript
import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry } from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API calls: network-first with 3s timeout, fallback to cache
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Images from S3/CDN: cache-first
    {
      urlPattern: /\.(?:png|jpg|jpeg|webp|avif)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // Everything else: Serwist defaults (stale-while-revalidate for assets)
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
```

### 2.4 Next.js config (`next.config.ts`)

```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
});

export default withSerwist({
  // next config
});
```

### 2.5 iOS PWA Limitations — MUST KNOW

| Issue | Details | Workaround |
|-------|---------|------------|
| **Camera permissions re-prompted every launch** | `getUserMedia` permissions don't persist in standalone mode PWAs | Use `<input type="file" capture>` as primary method (no permission prompt) |
| **No persistent permissions** | Camera/mic permissions reset when PWA is closed | Design UX to expect the prompt; use `<input capture>` where possible |
| **Push notifications** | Supported since iOS 16.4+ but requires user to add to home screen first | Show custom "Add to Home Screen" banner before requesting push |
| **No Badge API** | Can't show notification count on icon | N/A — live with it |
| **50MB storage cap** | WebKit evicts data after 7 days of no use (relaxed in recent iOS) | Sync to server frequently; warn user about storage |
| **No background sync** | Service worker can't sync in background like Android | Sync on app open; show pending count |
| **`<a>` links open Safari** | External links leave the PWA | Use `target="_self"` for internal links; intercept with router |
| **No install prompt** | No `beforeinstallprompt` event on iOS | Custom "Add to Home Screen" instructions UI |
| **Audio/Video autoplay** | Requires user gesture | Always use `playsinline muted` on video elements |

### 2.6 "Add to Home Screen" Flow

```tsx
"use client";
import { useState, useEffect } from "react";

function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);
  return isStandalone;
}

function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  }, []);
  return isIOS;
}

export function AddToHomeScreenBanner() {
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("a2hs-dismissed") === "true");
  }, []);

  if (isStandalone || !isIOS || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-slate-900 text-white p-4 z-50 safe-area-pb">
      <button onClick={() => { localStorage.setItem("a2hs-dismissed", "true"); setDismissed(true); }}
        className="absolute top-2 right-2 text-slate-400">✕</button>
      <p className="text-sm font-medium">Install Home Inventory</p>
      <p className="text-xs text-slate-300 mt-1">
        Tap <span className="inline-block">
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l-2 2h-3v2h10V4h-3l-2-2zm-5 6v12h10V8H7z"/>
          </svg>
        </span> then <strong>"Add to Home Screen"</strong>
      </p>
    </div>
  );
}
```

---

## 3. Key Component Architecture

### 3.1 Camera Capture — THE TRICKY PART

**Strategy: Dual-mode camera**

- **Primary (iOS PWA safe):** `<input type="file" accept="image/*" capture="environment">` — Works everywhere, no permission issues, opens native camera UI
- **Enhanced (when available):** `getUserMedia` for live viewfinder with custom UI — better UX but has iOS PWA quirks

```tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Zap, ZapOff, X } from "lucide-react";

interface CapturedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

// Client-side image resize (critical for performance)
async function resizeImage(file: Blob, maxDim = 1920, quality = 0.85): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve({ blob, url: URL.createObjectURL(blob), width, height });
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function CameraCapture({ onCapture }: { onCapture: (img: CapturedImage) => void }) {
  const [mode, setMode] = useState<"idle" | "viewfinder" | "preview">("idle");
  const [preview, setPreview] = useState<CapturedImage | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [canUseViewfinder, setCanUseViewfinder] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if getUserMedia is available AND we're not in a problematic iOS PWA context
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // On iOS standalone PWA, getUserMedia works but re-prompts permissions every time.
    // We CAN use it, but default to file input for better UX.
    // Let user opt-in to viewfinder mode.
    if (navigator.mediaDevices?.getUserMedia) {
      setCanUseViewfinder(true);
    }
  }, []);

  // --- FILE INPUT METHOD (primary, always works) ---
  const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setPreview(resized);
    setMode("preview");
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  // --- VIEWFINDER METHOD (enhanced) ---
  const startViewfinder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // CRITICAL for iOS: must have playsinline attribute
        await videoRef.current.play();
      }
      setMode("viewfinder");
    } catch (err) {
      console.warn("getUserMedia failed, falling back to file input:", err);
      // Fallback: trigger file input
      fileInputRef.current?.click();
    }
  }, [facingMode]);

  const stopViewfinder = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureFromViewfinder = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );
    const resized = await resizeImage(blob);
    stopViewfinder();
    setPreview(resized);
    setMode("preview");
  }, [stopViewfinder]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // Flash/torch API — works on Android Chrome, spotty on iOS
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch {
      // Torch not supported on this device
    }
  }, [flashOn]);

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setMode("idle");
  }, [preview]);

  const confirm = useCallback(() => {
    if (preview) onCapture(preview);
    setMode("idle");
    setPreview(null);
  }, [preview, onCapture]);

  // Cleanup on unmount
  useEffect(() => () => stopViewfinder(), [stopViewfinder]);

  // --- PREVIEW MODE ---
  if (mode === "preview" && preview) {
    return (
      <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden">
        <img src={preview.url} alt="Captured" className="w-full h-full object-contain" />
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
          <Button variant="secondary" size="lg" onClick={retake}>
            <RotateCcw className="w-5 h-5 mr-2" /> Retake
          </Button>
          <Button size="lg" onClick={confirm}>
            Use Photo
          </Button>
        </div>
      </div>
    );
  }

  // --- VIEWFINDER MODE ---
  if (mode === "viewfinder") {
    return (
      <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline  // CRITICAL for iOS
          muted        // CRITICAL for iOS autoplay
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleFlash} className="text-white">
            {flashOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {
            stopViewfinder();
            setFacingMode(f => f === "environment" ? "user" : "environment");
            // Will re-trigger via useEffect or manual call
          }} className="text-white">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { stopViewfinder(); setMode("idle"); }} className="text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-6 inset-x-0 flex justify-center">
          <button
            onClick={captureFromViewfinder}
            className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:bg-white/50 transition"
          />
        </div>
      </div>
    );
  }

  // --- IDLE MODE ---
  return (
    <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-xl">
      {/* Hidden file input — always available as fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileCapture}
        className="hidden"
      />

      {/* Primary: native camera (works everywhere including iOS PWA) */}
      <Button size="lg" onClick={() => fileInputRef.current?.click()}>
        <Camera className="w-5 h-5 mr-2" /> Take Photo
      </Button>

      {/* Secondary: viewfinder mode (opt-in, may prompt for permissions) */}
      {canUseViewfinder && (
        <Button variant="outline" size="sm" onClick={startViewfinder}>
          Use Live Viewfinder
        </Button>
      )}
    </div>
  );
}
```

**Key iOS gotchas handled:**
1. `playsinline` and `muted` attributes are **mandatory** on `<video>` for iOS
2. `capture="environment"` opens rear camera directly — no permission prompt
3. getUserMedia permissions don't persist in standalone PWA — we make it opt-in
4. Torch/flash API is not supported on iOS Safari — we try/catch gracefully
5. Image is resized client-side before upload (iOS photos are 4-12MB raw)

### 3.2 AI Result Confirmation Screen

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  purchaseYear: z.number().optional(),
  condition: z.enum(["new", "like-new", "good", "fair", "poor"]),
  tags: z.array(z.string()),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface AIConfirmationProps {
  imageUrl: string;
  aiSuggestions: Partial<ItemFormData>;
  confidence: Record<string, number>; // 0-1 per field
  onConfirm: (data: ItemFormData) => void;
}

export function AIConfirmation({ imageUrl, aiSuggestions, confidence, onConfirm }: AIConfirmationProps) {
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      category: "",
      condition: "good",
      tags: [],
      ...aiSuggestions,
    },
  });

  // Visual indicator: low confidence fields get highlighted
  const fieldStyle = (field: string) =>
    (confidence[field] ?? 1) < 0.7
      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
      : "";

  return (
    <form onSubmit={form.handleSubmit(onConfirm)} className="space-y-4 p-4">
      <div className="flex gap-4">
        <img src={imageUrl} alt="Item" className="w-24 h-24 rounded-lg object-cover shrink-0" />
        <div className="flex-1 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Item Name</label>
            <Input {...form.register("name")} className={fieldStyle("name")} />
            {confidence.name < 0.7 && (
              <p className="text-xs text-amber-600 mt-0.5">AI unsure — please verify</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <Input {...form.register("category")} className={fieldStyle("category")} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Brand</label>
          <Input {...form.register("brand")} className={fieldStyle("brand")} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Est. Value (£)</label>
          <Input type="number" {...form.register("estimatedValue", { valueAsNumber: true })}
            className={fieldStyle("estimatedValue")} />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Tags</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {form.watch("tags").map((tag, i) => (
            <Badge key={i} variant="secondary" className="cursor-pointer"
              onClick={() => form.setValue("tags", form.getValues("tags").filter((_, j) => j !== i))}>
              {tag} ✕
            </Badge>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg">
        Save Item
      </Button>
    </form>
  );
}
```

### 3.3 Location Picker (Hierarchical)

```tsx
"use client";
import { useState } from "react";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: "property" | "room" | "spot";
  parentId?: string;
}

interface LocationPickerProps {
  locations: Location[];
  value?: { propertyId?: string; roomId?: string; spotId?: string };
  onChange: (value: { propertyId: string; roomId: string; spotId?: string }) => void;
  onAddNew: (name: string, type: Location["type"], parentId?: string) => Promise<Location>;
}

export function LocationPicker({ locations, value, onChange, onAddNew }: LocationPickerProps) {
  const [step, setStep] = useState<"property" | "room" | "spot">("property");
  const [selected, setSelected] = useState(value ?? {});

  const properties = locations.filter(l => l.type === "property");
  const rooms = locations.filter(l => l.type === "room" && l.parentId === selected.propertyId);
  const spots = locations.filter(l => l.type === "spot" && l.parentId === selected.roomId);

  const currentItems = step === "property" ? properties : step === "room" ? rooms : spots;

  const handleSelect = (loc: Location) => {
    if (step === "property") {
      setSelected({ propertyId: loc.id });
      setStep("room");
    } else if (step === "room") {
      setSelected(s => ({ ...s, roomId: loc.id }));
      setStep("spot");
    } else {
      const final = { ...selected, spotId: loc.id } as any;
      onChange(final);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className={step === "property" ? "font-bold text-foreground" : ""}>Property</span>
        <ChevronRight className="w-3 h-3" />
        <span className={step === "room" ? "font-bold text-foreground" : ""}>Room</span>
        <ChevronRight className="w-3 h-3" />
        <span className={step === "spot" ? "font-bold text-foreground" : ""}>Spot</span>
      </div>

      <Command className="border rounded-lg">
        <CommandInput placeholder={`Search ${step}...`} />
        <CommandEmpty>
          <AddNewButton type={step} parentId={
            step === "room" ? selected.propertyId : step === "spot" ? selected.roomId : undefined
          } onAdd={async (name) => {
            const loc = await onAddNew(name, step, step === "room" ? selected.propertyId : selected.roomId);
            handleSelect(loc);
          }} />
        </CommandEmpty>
        <CommandGroup>
          {currentItems.map(loc => (
            <CommandItem key={loc.id} onSelect={() => handleSelect(loc)}>
              {loc.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>

      {step !== "property" && (
        <Button variant="ghost" size="sm" onClick={() => setStep(step === "spot" ? "room" : "property")}>
          ← Back
        </Button>
      )}

      {step === "spot" && (
        <Button variant="ghost" size="sm" onClick={() => onChange(selected as any)}>
          Skip (no specific spot)
        </Button>
      )}
    </div>
  );
}

function AddNewButton({ type, parentId, onAdd }: {
  type: string; parentId?: string;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 p-2">
      <Input value={name} onChange={e => setName(e.target.value)}
        placeholder={`New ${type} name...`} className="h-8 text-sm" />
      <Button size="sm" onClick={() => { if (name) onAdd(name); }}>
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}
```

### 3.4 Item Card / Grid

```tsx
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ItemGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
      {items.map(item => (
        <Card key={item.id} className="overflow-hidden">
          <div className="relative aspect-square">
            <Image
              src={item.thumbnailUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL={item.blurHash} // tiny base64 placeholder
            />
          </div>
          <div className="p-2">
            <p className="font-medium text-sm truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.room}</p>
            {item.estimatedValue && (
              <Badge variant="secondary" className="mt-1 text-xs">
                £{item.estimatedValue.toLocaleString()}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## 4. Offline-First Architecture

### 4.1 Dexie.js Schema (IndexedDB)

```typescript
// lib/db.ts
import Dexie, { type Table } from "dexie";

export interface DBItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  brand?: string;
  model?: string;
  estimatedValue?: number;
  condition: string;
  tags: string[];
  locationId: string;
  imageBlob?: Blob;        // stored locally until synced
  imageUrl?: string;        // server URL after sync
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: "pending" | "synced" | "error";
}

export interface SyncQueueEntry {
  id: string;
  action: "create" | "update" | "delete";
  table: string;
  entityId: string;
  payload: any;
  createdAt: number;
  retries: number;
}

class InventoryDB extends Dexie {
  items!: Table<DBItem>;
  locations!: Table<any>;
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super("inventory");
    this.version(1).stores({
      items: "id, category, locationId, syncStatus, createdAt, *tags",
      locations: "id, type, parentId",
      syncQueue: "id, createdAt",
    });
  }
}

export const db = new InventoryDB();
```

### 4.2 Sync Queue

```typescript
// lib/sync.ts
import { db, type SyncQueueEntry } from "./db";
import { nanoid } from "nanoid";

export async function queueMutation(action: SyncQueueEntry["action"], table: string, entityId: string, payload: any) {
  await db.syncQueue.add({
    id: nanoid(),
    action,
    table,
    entityId,
    payload,
    createdAt: Date.now(),
    retries: 0,
  });

  // Try to sync immediately if online
  if (navigator.onLine) {
    processSyncQueue();
  }
}

export async function processSyncQueue() {
  const pending = await db.syncQueue.orderBy("createdAt").toArray();
  for (const entry of pending) {
    try {
      await syncEntry(entry);
      await db.syncQueue.delete(entry.id);

      // If it was a create with an image blob, upload it and update URL
      if (entry.action === "create" && entry.table === "items") {
        const item = await db.items.get(entry.entityId);
        if (item?.imageBlob) {
          const url = await uploadImage(item.imageBlob, entry.entityId);
          await db.items.update(entry.entityId, { imageUrl: url, imageBlob: undefined, syncStatus: "synced" });
        }
      }
    } catch (err) {
      await db.syncQueue.update(entry.id, { retries: entry.retries + 1 });
      if (entry.retries >= 3) {
        await db.items.update(entry.entityId, { syncStatus: "error" });
      }
      break; // Stop processing — maintain order
    }
  }
}

// Listen for connectivity changes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => processSyncQueue());
}
```

### 4.3 Zustand Store + TanStack Query

```typescript
// stores/inventory.ts
import { create } from "zustand";
import { db } from "@/lib/db";
import { queueMutation } from "@/lib/sync";

interface InventoryStore {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  pendingCount: 0,
  refreshPendingCount: async () => {
    const count = await db.syncQueue.count();
    set({ pendingCount: count });
  },
}));

// TanStack Query hooks for server-synced data
// hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";

export function useItems(filters?: ItemFilters) {
  // Read from IndexedDB (instant, offline-ready)
  const localItems = useLiveQuery(
    () => db.items.where("category").equals(filters?.category ?? "").toArray(),
    [filters]
  );

  // Also sync from server when online
  const serverQuery = useQuery({
    queryKey: ["items", filters],
    queryFn: () => fetch("/api/items?" + new URLSearchParams(filters as any)).then(r => r.json()),
    enabled: typeof navigator !== "undefined" && navigator.onLine,
    staleTime: 5 * 60 * 1000,
  });

  // Merge: local is source of truth, server fills gaps
  return localItems ?? serverQuery.data ?? [];
}
```

---

## 5. Performance

### 5.1 Image Optimization (already in camera component)
- Resize to max 1920px before upload
- JPEG quality 0.85 (~200-400KB from a 4K phone photo)
- Generate thumbnail (400px) on server, serve via CDN
- Use `next/image` with `sizes` and `loading="lazy"` for grid views

### 5.2 Bundle Size
- shadcn/ui: tree-shakeable, only import used components
- Dexie: ~25KB gzipped
- Zustand: ~1KB
- Recharts: ~40KB — dynamically import dashboard only: `const Chart = dynamic(() => import("./ValueChart"), { ssr: false })`
- Total target: < 150KB first-load JS

### 5.3 Skeleton States

```tsx
export function ItemCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-2 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </Card>
  );
}

export function ItemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => <ItemCardSkeleton key={i} />)}
    </div>
  );
}
```

---

## 6. Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── layout.tsx              # Bottom nav, sync status bar
│   │   ├── page.tsx                # Dashboard
│   │   ├── items/
│   │   │   ├── page.tsx            # Item grid + search
│   │   │   ├── [id]/page.tsx       # Item detail
│   │   │   └── new/page.tsx        # Camera → AI → confirm → save
│   │   ├── locations/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── offline/page.tsx            # Offline fallback
│   ├── sw.ts                       # Serwist service worker
│   ├── manifest.ts
│   ├── layout.tsx                  # Root: metadata, providers
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn/ui primitives
│   ├── camera/
│   │   └── camera-capture.tsx
│   ├── items/
│   │   ├── item-card.tsx
│   │   ├── item-grid.tsx
│   │   ├── item-form.tsx
│   │   └── ai-confirmation.tsx
│   ├── locations/
│   │   └── location-picker.tsx
│   ├── search/
│   │   ├── search-bar.tsx
│   │   └── filter-sheet.tsx
│   ├── dashboard/
│   │   └── value-chart.tsx
│   ├── pwa/
│   │   ├── add-to-homescreen.tsx
│   │   ├── sync-status.tsx
│   │   └── offline-indicator.tsx
│   └── skeletons/
│       └── index.tsx
├── hooks/
│   ├── use-items.ts
│   ├── use-locations.ts
│   ├── use-camera.ts
│   └── use-online-status.ts
├── lib/
│   ├── db.ts                       # Dexie schema
│   ├── sync.ts                     # Sync queue logic
│   ├── image-utils.ts              # Resize, compress
│   └── utils.ts                    # cn() helper etc
├── stores/
│   └── inventory.ts                # Zustand store
├── types/
│   └── index.ts
└── public/
    ├── icons/                      # PWA icons (192, 512, maskable)
    └── splash/                     # iOS splash screens
```

---

## 7. Summary of Critical Decisions

1. **Camera: `<input capture>` is primary, `getUserMedia` is opt-in enhancement.** This avoids the iOS PWA permission re-prompting nightmare while still offering a rich viewfinder for users who want it.

2. **Serwist over next-pwa.** It's the maintained successor with Turbopack support.

3. **Dexie.js + custom sync queue for offline.** TanStack Query handles server cache; Dexie handles local-first persistence. The sync queue processes in order with retry logic.

4. **shadcn/ui components are copied into the project**, not imported from a package — this means zero dependency risk and full customization control.

5. **Client-side image resize is non-negotiable.** iPhone photos are 3-12MB. We resize to 1920px max at 85% JPEG quality before any upload or IndexedDB storage.

6. **iOS PWA "Add to Home Screen" requires a custom UI.** There's no `beforeinstallprompt` event — we detect iOS + non-standalone and show instructions.