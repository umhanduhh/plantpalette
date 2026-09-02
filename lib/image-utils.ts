// Client-side photo downsizing before it's sent to Gemini or uploaded to
// storage — mobile camera photos can be 10-40MB, far more detail than a
// food-identification model needs and needlessly slow/expensive to send.

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

export interface ProcessedImage {
  base64: string;   // no "data:...;base64," prefix
  mimeType: string;
  blob: Blob;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read photo'));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function fallbackToOriginal(file: File): Promise<ProcessedImage> {
  const base64 = await blobToBase64(file);
  return { base64, mimeType: file.type || 'image/jpeg', blob: file };
}

// Resizes to a max dimension and re-encodes as JPEG via canvas. Falls back
// to sending the original file untouched if the browser can't decode it
// (e.g. some HEIC cases) rather than blocking the upload entirely.
export async function processImageFile(file: File): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return fallbackToOriginal(file);
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallbackToOriginal(file);

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return fallbackToOriginal(file);

    const base64 = await blobToBase64(blob);
    return { base64, mimeType: 'image/jpeg', blob };
  } catch {
    return fallbackToOriginal(file);
  }
}
