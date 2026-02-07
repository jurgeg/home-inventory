const MAX_DIMENSION = 1024;
const TARGET_SIZE_BYTES = 200 * 1024; // 200KB
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.4;

/**
 * Compress and resize an image file for upload.
 * - Resizes to max 1024px on longest edge
 * - Converts to WebP where supported, falls back to JPEG
 * - Targets <200KB via iterative quality reduction
 * Returns a base64 data URL string.
 */
export async function compressImage(file: File | Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions
  let newW = width;
  let newH = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    newW = Math.round(width * ratio);
    newH = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(newW, newH);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  // Try WebP first, fall back to JPEG
  const formats = ["image/webp", "image/jpeg"];
  for (const format of formats) {
    let quality = INITIAL_QUALITY;
    while (quality >= MIN_QUALITY) {
      const blob = await canvas.convertToBlob({ type: format, quality });
      if (blob.size <= TARGET_SIZE_BYTES) {
        return blobToDataURL(blob);
      }
      quality -= 0.1;
    }
    // Last attempt at min quality
    const blob = await canvas.convertToBlob({ type: format, quality: MIN_QUALITY });
    if (blob.size <= TARGET_SIZE_BYTES || format === formats[formats.length - 1]) {
      return blobToDataURL(blob);
    }
  }

  // Shouldn't reach here, but fallback
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: MIN_QUALITY });
  return blobToDataURL(blob);
}

/**
 * Extract raw base64 (no data: prefix) from a data URL.
 */
export function dataURLToBase64(dataURL: string): string {
  return dataURL.split(",")[1];
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
