import { join } from "node:path";
import { BUDGET } from "@curb/pipeline";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { listPhotoFiles, loadPhotosForModel } from "../src/io/photos.ts";

const sampleDir = join(import.meta.dirname, "../../../samples/01");

describe("loadPhotosForModel", () => {
  it("downscales photos to the budget's long edge as JPEG", async () => {
    const files = (await listPhotoFiles(sampleDir)).slice(0, 2);
    const photos = await loadPhotosForModel(sampleDir, files);
    expect(photos.map((p) => p.file)).toEqual(files);
    for (const photo of photos) {
      const meta = await sharp(Buffer.from(photo.image.base64, "base64")).metadata();
      expect(meta.format).toBe("jpeg");
      expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(BUDGET.maxImageEdgePx);
    }
  });

  it("lists only image files, sorted", async () => {
    const files = await listPhotoFiles(sampleDir);
    expect(files.length).toBeGreaterThan(5);
    expect(files.every((f) => f.endsWith(".jpg"))).toBe(true);
    expect([...files].sort()).toEqual(files);
  });
});
