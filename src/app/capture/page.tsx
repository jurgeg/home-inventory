"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, ImagePlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CapturePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="px-4 pt-12 safe-area-pt space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Add Item</h1>
      </div>

      {preview ? (
        /* Post-capture: photo + AI fields */
        <div className="space-y-4">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <img src={preview} alt="Captured" className="w-full h-full object-cover" />
          </div>

          {isProcessing ? (
            /* AI processing skeleton */
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Identifying...
                </p>
                {["Name", "Category", "Brand", "Est. Value"].map((field) => (
                  <div key={field} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{field}</p>
                    <div className="h-9 animate-shimmer rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            /* AI result confirmation form placeholder */
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">AI identification complete</p>
                {[
                  { label: "Name", value: "Item Name" },
                  { label: "Category", value: "Category" },
                  { label: "Brand", value: "Brand" },
                  { label: "Est. Value", value: "£0" },
                ].map((field) => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <div className="h-9 border rounded-md px-3 flex items-center text-sm">
                      {field.value}
                    </div>
                  </div>
                ))}

                <Button className="w-full" size="lg">
                  Save Item
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  Save & Add Another
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Camera / photo picker */
        <div className="flex flex-col items-center gap-6 pt-16">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-10 h-10 text-primary" />
          </div>

          <div className="text-center space-y-1">
            <p className="font-semibold">Snap your item</p>
            <p className="text-sm text-muted-foreground">
              Take a photo and we'll identify it with AI
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                // Remove capture attr to open library
                const input = fileInputRef.current;
                if (input) {
                  input.removeAttribute("capture");
                  input.click();
                  input.setAttribute("capture", "environment");
                }
              }}
            >
              <ImagePlus className="w-5 h-5 mr-2" />
              Choose from Library
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
