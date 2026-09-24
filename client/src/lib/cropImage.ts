import type { Area, MediaSize, Size } from "react-easy-crop";

const AVATAR_OUTPUT_SIZE = 512;

/** Minimum zoom so the crop area can span the full rendered image width. */
export function computeMinZoomForFullWidth(mediaSize: MediaSize, cropSize: Size): number {
  if (mediaSize.width <= 0) {
    return 1;
  }
  return Math.min(1, cropSize.width / mediaSize.width);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

export async function getCroppedAvatarBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

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
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to crop image"));
        }
      },
      "image/jpeg",
      0.92,
    );
  });
}
