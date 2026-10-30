import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { BUDGET, type ListingPhoto, type ModelImage } from "@curb/pipeline";
import sharp from "sharp";

const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/** Lists a listing's photos in file-name order. */
export async function listPhotoFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files.filter((f) => PHOTO_EXTENSIONS.test(f)).sort();
}

/**
 * Loads photos for the model: re-encoded as JPEG and downscaled to BUDGET.maxImageEdgePx on
 * the long edge (CLAUDE.md rule 9). The full-size files are still used for rendering.
 */
export async function loadPhotosForModel(
  dir: string,
  files: readonly string[],
): Promise<ListingPhoto[]> {
  return Promise.all(
    files.map(async (file) => {
      const buffer = await sharp(join(dir, file))
        .rotate()
        .resize({
          width: BUDGET.maxImageEdgePx,
          height: BUDGET.maxImageEdgePx,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      return {
        file,
        image: { mediaType: "image/jpeg" as const, base64: buffer.toString("base64") },
      };
    }),
  );
}

/** Downscales a rendered slide for the critique step (BUDGET.critiqueImageEdgePx). */
export async function slideImageForModel(png: Uint8Array): Promise<ModelImage> {
  const buffer = await sharp(png)
    .resize({
      width: BUDGET.critiqueImageEdgePx,
      height: BUDGET.critiqueImageEdgePx,
      fit: "inside",
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { mediaType: "image/jpeg", base64: buffer.toString("base64") };
}
