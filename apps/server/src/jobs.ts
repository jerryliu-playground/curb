import { randomUUID } from "node:crypto";
import {
  checkCompliance,
  generateCarousel,
  type ListingPhoto,
  type ModelClient,
  type PrepareSlideImage,
  regenerateSlide,
  type RenderedSlide,
  type ResultCache,
} from "@curb/pipeline";
import type { RenderCarouselInput } from "@curb/renderer";
import {
  type BrandKit,
  type CarouselPlan,
  CarouselPlanSchema,
  checkCarouselPlan,
  type ComplianceFlag,
  type CritiqueRoundView,
  type EditCopyRequest,
  type EditSlideRequest,
  type JobEvent,
  type JobStatus,
  type JobView,
  listingFacts,
  type PhotoAnalysis,
  type Slide,
} from "@curb/shared";
import type { Template } from "@curb/templates";
import { buildExportZip } from "./export.ts";
import { HttpError } from "./http-error.ts";
import type { SampleListing } from "./samples.ts";

export interface JobDeps {
  render: (input: RenderCarouselInput) => Promise<RenderedSlide[]>;
  createClient: (sample: SampleListing) => Promise<ModelClient>;
  loadPhotos: (sample: SampleListing) => Promise<ListingPhoto[]>;
  prepareSlideImage: PrepareSlideImage;
  brandKit: BrandKit;
  cache?: ResultCache;
}

interface Job {
  id: string;
  sample: SampleListing;
  templateName: string;
  template: Template;
  status: JobStatus;
  busy: boolean;
  error: string | null;
  progress: string[];
  client: ModelClient | null;
  analyses: PhotoAnalysis[];
  plan: CarouselPlan | null;
  slides: Uint8Array[];
  slideVersions: number[];
  overflow: string[][];
  critique: CritiqueRoundView[];
  flags: ComplianceFlag[];
  approval: { approvedAt: string; flagIds: string[] } | null;
  listeners: Set<(event: JobEvent) => void>;
}

/** In-process job store (ADR 0003): one generation per job, edited in place until export. */
export class JobService {
  private readonly jobs = new Map<string, Job>();

  constructor(private readonly deps: JobDeps) {}

  create(sample: SampleListing, templateName: string, template: Template): JobView {
    const job: Job = {
      id: randomUUID(),
      sample,
      templateName,
      template,
      status: "running",
      busy: false,
      error: null,
      progress: [],
      client: null,
      analyses: [],
      plan: null,
      slides: [],
      slideVersions: [],
      overflow: [],
      critique: [],
      flags: [],
      approval: null,
      listeners: new Set(),
    };
    this.jobs.set(job.id, job);
    void this.run(job);
    return this.view(job.id);
  }

  view(id: string): JobView {
    const job = this.get(id);
    return {
      id: job.id,
      sampleId: job.sample.id,
      template: job.templateName,
      status: job.status,
      busy: job.busy,
      error: job.error,
      progress: job.progress,
      listing: listingFacts(job.sample.listing),
      plan: job.plan,
      slideVersions: job.slideVersions,
      overflow: job.overflow,
      critique: job.critique,
      flags: job.flags,
      photos: job.analyses.map((a) => ({ file: a.file, roomType: a.roomType })),
      approval: job.approval,
    };
  }

  /** Replays progress so far, then streams new events. Returns an unsubscribe function. */
  subscribe(id: string, listener: (event: JobEvent) => void): () => void {
    const job = this.get(id);
    for (const message of job.progress) listener({ type: "progress", message });
    if (job.status === "ready") listener({ type: "ready" });
    if (job.status === "failed") listener({ type: "failed", error: job.error ?? "Failed" });
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }

  slidePng(id: string, index: number): Uint8Array {
    const png = this.get(id).slides[index];
    if (!png) throw new HttpError(404, "No such slide.");
    return png;
  }

  async editSlide(id: string, index: number, edit: EditSlideRequest): Promise<JobView> {
    return this.mutate(id, async (job, plan) => {
      const slide = this.slideAt(plan, index);
      const next = { ...slide } as Slide & { body?: string; photo?: string | null };
      if (edit.headline !== undefined) next.headline = edit.headline;
      if (edit.altText !== undefined) next.altText = edit.altText;
      if (edit.body !== undefined) {
        if (!("body" in slide)) throw new HttpError(400, `A ${slide.type} slide has no body text.`);
        next.body = edit.body;
      }
      if (edit.photo !== undefined) {
        if (slide.type === "gallery")
          throw new HttpError(400, "Gallery photos can't be swapped one at a time.");
        next.photo = edit.photo;
      }
      await this.replaceSlide(job, plan, index, next);
    });
  }

  async regenerateSlide(id: string, index: number, note: string): Promise<JobView> {
    return this.mutate(id, async (job, plan) => {
      this.slideAt(plan, index);
      this.log(job, `Regenerating slide ${index + 1}${note ? `: "${note}"` : ""}`);
      const slide = await regenerateSlide({
        client: this.clientOf(job),
        listing: job.sample.listing,
        analyses: job.analyses,
        plan,
        index,
        note,
      });
      await this.replaceSlide(job, plan, index, slide);
    });
  }

  async editCopy(id: string, edit: EditCopyRequest): Promise<JobView> {
    return this.mutate(id, async (job, plan) => {
      const next: CarouselPlan = {
        ...plan,
        ...(edit.caption !== undefined ? { caption: edit.caption } : {}),
        ...(edit.hashtags !== undefined ? { hashtags: edit.hashtags } : {}),
      };
      this.validate(job, next);
      job.plan = next;
      await this.recheckCompliance(job);
    });
  }

  approve(id: string, shownFlagIds: readonly string[]): JobView {
    const job = this.get(id);
    this.requireEditable(job);
    if (job.overflow.some((o) => o.length > 0)) {
      throw new HttpError(
        409,
        "Some slides have text that doesn't fit. Fix them before approving.",
      );
    }
    const shown = new Set(shownFlagIds);
    const missing = job.flags.filter((f) => !shown.has(f.id));
    if (missing.length > 0) {
      throw new HttpError(
        409,
        "Review every compliance flag before approving.",
        missing.map((f) => f.id),
      );
    }
    job.approval = { approvedAt: new Date().toISOString(), flagIds: job.flags.map((f) => f.id) };
    this.log(job, "Approved for export");
    this.emit(job, { type: "updated" });
    return this.view(id);
  }

  exportZip(id: string): { filename: string; zip: Uint8Array } {
    const job = this.get(id);
    if (!job.approval || !job.plan)
      throw new HttpError(409, "Approve the carousel before exporting.");
    return {
      filename: `curb-${job.sample.id}-${job.templateName}.zip`,
      zip: buildExportZip({ plan: job.plan, slides: job.slides, flags: job.flags }),
    };
  }

  // --- internals -------------------------------------------------------------

  private get(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new HttpError(404, "No such job.");
    return job;
  }

  private slideAt(plan: CarouselPlan, index: number): Slide {
    const slide = plan.slides[index];
    if (!slide) throw new HttpError(404, "No such slide.");
    return slide;
  }

  private clientOf(job: Job): ModelClient {
    if (!job.client) throw new HttpError(409, "The job has no model client yet.");
    return job.client;
  }

  private requireEditable(job: Job): asserts job is Job & { plan: CarouselPlan } {
    if (job.status !== "ready" || !job.plan)
      throw new HttpError(409, "The carousel isn't ready yet.");
    if (job.busy) throw new HttpError(409, "Another change is still in progress.");
  }

  private async mutate(
    id: string,
    change: (job: Job, plan: CarouselPlan) => Promise<void>,
  ): Promise<JobView> {
    const job = this.get(id);
    this.requireEditable(job);
    job.busy = true;
    this.emit(job, { type: "updated" });
    try {
      await change(job, job.plan);
      // Any change needs a fresh approval (CLAUDE.md rule 3).
      job.approval = null;
    } finally {
      job.busy = false;
      this.emit(job, { type: "updated" });
    }
    return this.view(id);
  }

  private validate(job: Job, plan: CarouselPlan): void {
    const parsed = CarouselPlanSchema.safeParse(plan);
    const problems = parsed.success
      ? checkCarouselPlan(
          plan,
          job.analyses.map((a) => a.file),
        )
      : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    if (problems.length > 0) throw new HttpError(400, "That change isn't valid.", problems);
  }

  private async replaceSlide(
    job: Job,
    plan: CarouselPlan,
    index: number,
    slide: Slide,
  ): Promise<void> {
    const next = { ...plan, slides: plan.slides.map((s, i) => (i === index ? slide : s)) };
    this.validate(job, next);
    const [rendered] = await this.deps.render(this.renderInput(job, next, [index]));
    if (!rendered) throw new Error("Render returned nothing.");
    job.plan = next;
    job.slides[index] = rendered.png;
    job.overflow[index] = rendered.overflow;
    job.slideVersions[index] = (job.slideVersions[index] ?? 0) + 1;
    await this.recheckCompliance(job);
  }

  private async recheckCompliance(job: Job): Promise<void> {
    if (!job.plan) return;
    job.flags = await checkCompliance({ client: this.clientOf(job), plan: job.plan });
  }

  private renderInput(job: Job, plan: CarouselPlan, only?: readonly number[]): RenderCarouselInput {
    return {
      template: job.template,
      listing: job.sample.listing,
      plan,
      analyses: job.analyses,
      brandKit: this.deps.brandKit,
      photoDir: job.sample.dir,
      ...(only ? { only } : {}),
    };
  }

  private log(job: Job, message: string): void {
    job.progress.push(message);
    this.emit(job, { type: "progress", message });
  }

  private emit(job: Job, event: JobEvent): void {
    for (const listener of job.listeners) listener(event);
  }

  private async run(job: Job): Promise<void> {
    try {
      job.client = await this.deps.createClient(job.sample);
      this.log(job, `Analyzing ${job.sample.photos.length} photos`);
      const photos = await this.deps.loadPhotos(job.sample);
      const result = await generateCarousel({
        client: job.client,
        listing: job.sample.listing,
        photos,
        brandKit: this.deps.brandKit,
        prepareSlideImage: this.deps.prepareSlideImage,
        ...(this.deps.cache ? { cache: this.deps.cache } : {}),
        render: (input) => {
          job.analyses = [...input.analyses];
          return this.deps.render(this.renderInput(job, input.plan, input.only));
        },
        onProgress: (e) => {
          if (e.step === "photo-analysis" && e.done === e.total)
            this.log(job, "Photo analysis done");
          if (e.step === "carousel-plan" && e.status === "done") this.log(job, "Carousel planned");
          if (e.step === "render" && e.status === "done")
            this.log(job, `Rendered ${e.slides} slides`);
          if (e.step === "critique" && e.status === "done") {
            this.log(job, `Critique round ${e.round}: ${e.changes ?? 0} changes`);
          }
          if (e.step === "compliance" && e.status === "done")
            this.log(job, `Compliance check: ${e.flags ?? 0} flags`);
        },
      });
      job.analyses = result.analyses;
      job.plan = result.plan;
      job.slides = result.slides.map((s) => s.png);
      job.overflow = result.slides.map((s) => s.overflow);
      job.slideVersions = result.slides.map(() => 1);
      job.critique = result.critique.map(({ round, summary, changes }) => ({
        round,
        summary,
        changes,
      }));
      job.flags = result.flags;
      job.status = "ready";
      this.emit(job, { type: "ready" });
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      this.emit(job, { type: "failed", error: job.error });
    }
  }
}
