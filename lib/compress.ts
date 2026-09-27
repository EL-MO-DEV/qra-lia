/**
 * Compresses a photo in the browser before it ever leaves the device.
 * - Longest side capped at `maxSide`.
 * - Exported as JPEG at `quality`.
 * - Respects EXIF orientation.
 * - Retries once at a lower quality if the result is still too big.
 */

const MAX_BYTES_BEFORE_RETRY = 3 * 1024 * 1024; // ~3MB

export type CompressedImage = {
  base64: string; // no "data:" prefix
  mimeType: "image/jpeg";
  previewUrl: string; // object URL for the thumbnail — revoke it when leaving the result screen
};

async function getBitmapOrImage(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // @ts-expect-error - imageOrientation is supported in modern browsers, not always typed
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img> based decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
    img.src = url;
    return await loaded;
  } finally {
    // the <img> keeps its own decoded copy once loaded; safe to revoke shortly after
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function getDims(source: ImageBitmap | HTMLImageElement) {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number
): HTMLCanvasElement {
  const { width, height } = getDims(source);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))),
      "image/jpeg",
      quality
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the "data:image/jpeg;base64," prefix
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.8
): Promise<CompressedImage> {
  const source = await getBitmapOrImage(file);
  const canvas = drawToCanvas(source, maxSide);

  let blob = await canvasToBlob(canvas, quality);
  if (blob.size > MAX_BYTES_BEFORE_RETRY) {
    blob = await canvasToBlob(canvas, 0.6);
  }

  const [base64, previewUrl] = await Promise.all([
    blobToBase64(blob),
    Promise.resolve(URL.createObjectURL(blob)),
  ]);

  if (source instanceof ImageBitmap) {
    source.close();
  }

  return { base64, mimeType: "image/jpeg", previewUrl };
}
