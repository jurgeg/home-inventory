export interface ItemIdentification {
  name: string;
  description: string;
  category: string;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  currency: string;
  condition: "new" | "excellent" | "good" | "fair" | "poor";
  brand: string | null;
  tags: string[];
}

export interface IdentifyResponse {
  result: ItemIdentification;
  raw: string;
}

export interface IdentifyError {
  error: string;
  raw?: string;
}

/**
 * Send an image to the identify API route and get structured item data back.
 * @param image - base64 string (with or without data: prefix) OR leave undefined if using imageUrl
 * @param imageUrl - public URL to the image (e.g. Supabase storage URL)
 */
export async function identifyItem(
  options: { image?: string; imageUrl?: string }
): Promise<ItemIdentification> {
  const res = await fetch("/api/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as IdentifyError).error || "Identification failed");
  }

  return (data as IdentifyResponse).result;
}
