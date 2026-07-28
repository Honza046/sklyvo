import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

/**
 * Vykreslí výřez z `react-easy-crop` do JPEG blobu (čtverec pro avatar).
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  options?: { mimeType?: string; quality?: number; outputSize?: number },
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const mimeType = options?.mimeType ?? "image/jpeg";
  const quality = options?.quality ?? 0.92;
  const outputSize = options?.outputSize ?? 512;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nepodařilo se připravit plátno pro ořez.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nepodařilo se vytvořit oříznutý obrázek."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
