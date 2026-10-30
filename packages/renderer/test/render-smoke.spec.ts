import { expect, test } from "@playwright/test";
import { SLIDE_VIEWPORT } from "../src/index.ts";

// Proves the render toolchain works end to end: HTML in, PNG of the exact slide size out.
test("renders an HTML page to a slide-sized PNG", async ({ page }) => {
  await page.setContent('<div style="width:100%;height:100vh;background:#123"></div>');
  const png = await page.screenshot();
  // PNG IHDR: width and height are big-endian uint32 at byte offsets 16 and 20.
  expect(png.readUInt32BE(16)).toBe(SLIDE_VIEWPORT.width);
  expect(png.readUInt32BE(20)).toBe(SLIDE_VIEWPORT.height);
});
