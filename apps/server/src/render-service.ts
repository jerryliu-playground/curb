import {
  launchRenderer,
  type RenderCarouselInput,
  renderCarousel,
  type SlideRenderer,
} from "@curb/renderer";

/**
 * One shared headless browser for the server. Renders run one at a time because they share a
 * page; the browser starts on first use.
 */
export class RenderService {
  private renderer: Promise<SlideRenderer> | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  render(input: RenderCarouselInput) {
    const run = async () => renderCarousel(await (this.renderer ??= launchRenderer()), input);
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async close(): Promise<void> {
    if (this.renderer) await (await this.renderer).close();
  }
}
