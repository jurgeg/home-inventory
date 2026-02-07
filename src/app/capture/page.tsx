"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, ImagePlus, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { compressImage } from "@/lib/image-utils";
import { identifyItem, type ItemIdentification } from "@/lib/ai";

export default function CapturePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ItemIdentification | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setSaved(false);

    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsProcessing(true);

    try {
      const compressed = await compressImage(file);
      // compressImage returns a data URL string - extract base64 part
      const base64 = compressed.split(",")[1] || compressed;
      const aiResult = await identifyItem({ image: base64 });
      setResult(aiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to identify item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    // TODO: save to Supabase
    setSaved(true);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="space-y-4">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <img src={preview} alt="Captured" className="w-full h-full object-cover" />
          </div>

          {isProcessing ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Identifying with AI...
                </p>
                {["Name", "Category", "Brand", "Est. Value"].map((field) => (
                  <div key={field} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{field}</p>
                    <div className="h-9 bg-muted animate-pulse rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" className="mt-3" onClick={handleReset}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : result ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                {saved ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="font-medium">Saved!</p>
                    <Button className="mt-4" onClick={handleReset}>
                      Add Another Item
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">AI identification complete — edit if needed</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Name</p>
                      <Input defaultValue={result.name} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <Input defaultValue={result.category} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Brand</p>
                      <Input defaultValue={result.brand || ""} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <Input defaultValue={result.description} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Value (low)</p>
                        <Input defaultValue={`£${result.estimatedValueLow}`} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Value (high)</p>
                        <Input defaultValue={`£${result.estimatedValueHigh}`} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <Input defaultValue={result.condition} className="h-9" />
                    </div>
                    <Button className="w-full" size="lg" onClick={handleSave}>
                      Save Item
                    </Button>
                    <Button variant="outline" className="w-full" size="lg" onClick={handleReset}>
                      Retake Photo
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
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
              Take a photo and AI will identify it and estimate its value
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
