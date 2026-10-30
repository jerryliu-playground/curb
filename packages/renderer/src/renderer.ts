import { type Browser, chromium, type Page } from "playwright";

/** Pages load photos and fonts from this origin only; nothing reaches the network. */
export const ASSET_ORIGIN = "https://assets.curb.local";

export interface RenderedSlide {
  png: Buffer;
  /** Text boxes whose content doesn't fit, as readable messages. Empty means the slide fits. */
  overflow: string[];
}

/** Resolves an asset path like `/photos/a.jpg` to a file on disk, or undefined if unknown. */
export type AssetResolver = (path: string) => string | undefined;

export interface SlideRenderer {
  render(html: string, assets: AssetResolver): Promise<RenderedSlide>;
  close(): Promise<void>;
}

const VIEWPORT = { width: 1080, height: 1350 };

/** Runs in the page: every `[data-fit]` box must contain its content and stay on the slide. */
function measureOverflow(size: { width: number; height: number }): string[] {
  const problems: string[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-fit]"))) {
    const name = el.dataset.fit ?? "?";
    const rect = el.getBoundingClientRect();
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      problems.push(
        `${name}: content is ${el.scrollWidth}×${el.scrollHeight}px but the box is ${el.clientWidth}×${el.clientHeight}px`,
      );
    }
    if (rect.left < 0 || rect.top < 0 || rect.right > size.width || rect.bottom > size.height) {
      problems.push(`${name}: box extends past the slide edge`);
    }
  }
  for (const img of Array.from(document.images)) {
    if (!img.complete || img.naturalWidth === 0) problems.push(`image failed to load: ${img.src}`);
  }
  return problems;
}

async function preparePage(
  browser: Browser,
): Promise<{ page: Page; setAssets: (r: AssetResolver) => void }> {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  let assets: AssetResolver = () => undefined;

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const file = url.origin === ASSET_ORIGIN ? assets(decodeURIComponent(url.pathname)) : undefined;
    if (file) await route.fulfill({ path: file });
    else await route.abort("blockedbyclient");
  });
  return { page, setAssets: (r) => (assets = r) };
}

export async function launchRenderer(): Promise<SlideRenderer> {
  const browser = await chromium.launch();
  const { page, setAssets } = await preparePage(browser);

  return {
    async render(html, assets) {
      setAssets(assets);
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const overflow = await page.evaluate(measureOverflow, VIEWPORT);
      const png = await page.screenshot({ type: "png" });
      return { png, overflow };
    },
    close: () => browser.close(),
  };
}
