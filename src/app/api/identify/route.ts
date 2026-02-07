import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Kitchen & Dining",
  "Clothing",
  "Books & Media",
  "Tools & DIY",
  "Garden",
  "Sports & Leisure",
  "Art & Decor",
  "Appliances",
  "Toys & Games",
  "Jewellery & Watches",
  "Musical Instruments",
  "Other",
] as const;

const SYSTEM_PROMPT = `You are a household item identification assistant for a UK-based home inventory app.

Given a photo, identify the item and return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "name": "Specific item name (e.g. 'Dyson V15 Detect Cordless Vacuum' not just 'vacuum')",
  "description": "Brief 1-2 sentence description of the item",
  "category": "one of: ${CATEGORIES.join(", ")}",
  "estimatedValueLow": <number in GBP, lower bound of current UK market value>,
  "estimatedValueHigh": <number in GBP, upper bound of current UK market value>,
  "currency": "GBP",
  "condition": "new|excellent|good|fair|poor",
  "brand": "<brand name if identifiable, or null>",
  "tags": ["relevant", "searchable", "tags"]
}

Rules:
- Values should reflect current UK second-hand/used market prices (eBay UK, Facebook Marketplace, etc.)
- For new-looking items, estimate the current retail price range instead
- If the brand is visible or identifiable, include it. Otherwise set brand to null
- Pick the single most appropriate category from the list
- Tags should be useful for searching: include material, colour, style, use-case
- If the image is blurry or unclear, do your best and add "uncertain" to tags
- If multiple items are visible, identify the most prominent/central item only and add "multiple-items-visible" to tags
- If you cannot identify the item at all, return: {"name": "Unknown Item", "description": "Could not identify the item from this image", "category": "Other", "estimatedValueLow": 0, "estimatedValueHigh": 0, "currency": "GBP", "condition": "fair", "brand": null, "tags": ["unidentified"]}
- condition guide: new=sealed/unused, excellent=like new minimal wear, good=normal use some wear, fair=visible wear still functional, poor=damaged/heavily worn`;

function getClient() {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, imageUrl } = body as {
      image?: string;
      imageUrl?: string;
    };

    if (!image && !imageUrl) {
      return NextResponse.json(
        { error: "Provide either 'image' (base64) or 'imageUrl'" },
        { status: 400 }
      );
    }

    // Build the image content part
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart = imageUrl
      ? { type: "image_url", image_url: { url: imageUrl } }
      : {
          type: "image_url",
          image_url: {
            url: image!.startsWith("data:")
              ? image!
              : `data:image/webp;base64,${image}`,
          },
        };

    const client = getClient();

    const response = await client.chat.completions.create({
      model: "moonshotai/kimi-k2.5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: "Identify this household item. Return only JSON.",
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "No response from AI model" },
        { status: 502 }
      );
    }

    // Parse JSON - strip code fences if model adds them
    const jsonStr = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw },
        { status: 502 }
      );
    }

    // Validate category
    if (!CATEGORIES.includes(result.category)) {
      result.category = "Other";
    }

    return NextResponse.json({ result, raw });
  } catch (err: unknown) {
    const error = err as Error & { status?: number; code?: string };
    console.error("Identify API error:", error);

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      );
    }
    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      return NextResponse.json(
        { error: "AI service timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to identify item" },
      { status: 500 }
    );
  }
}
