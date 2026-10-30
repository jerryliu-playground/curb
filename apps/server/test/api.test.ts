import { join } from "node:path";
import { createSampleModelClient } from "@curb/pipeline/testing";
import type { JobEvent, JobView } from "@curb/shared";
import { DEMO_BRAND_KIT } from "@curb/templates";
import { unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { readConfig } from "../src/config.ts";
import { JobService } from "../src/jobs.ts";
import { loadSampleLabels } from "../src/samples.ts";
import type { Services } from "../src/services.ts";

// Mock model + fake renderer: exercises the API without a browser or the network.
const root = join(import.meta.dirname, "../../..");
const config = readConfig({}, root);
let overflowOnRender: string[] = [];

function services(): Services {
  const jobs = new JobService({
    render: (input) =>
      Promise.resolve(
        (input.only ?? input.plan.slides.map((_, i) => i)).map((i) => ({
          png: new Uint8Array([137, 80, 78, 71, i]),
          overflow: overflowOnRender,
        })),
      ),
    createClient: async (sample) =>
      createSampleModelClient({ listing: sample.listing, labels: await loadSampleLabels(sample) }),
    loadPhotos: (sample) =>
      Promise.resolve(
        sample.photos.map((file) => ({
          file,
          image: { mediaType: "image/jpeg" as const, base64: file },
        })),
      ),
    prepareSlideImage: () => Promise.resolve({ mediaType: "image/jpeg", base64: "" }),
    brandKit: DEMO_BRAND_KIT,
  });
  return { config, jobs, close: () => Promise.resolve() };
}

let app: ReturnType<typeof buildApp>;
let svc: Services;
beforeEach(() => {
  overflowOnRender = [];
  svc = services();
  app = buildApp(svc);
});
afterEach(() => app.close());

async function readyJob(sampleId = "01"): Promise<JobView> {
  const res = await app.inject({
    method: "POST",
    url: "/api/jobs",
    payload: { sampleId, template: "modern" },
  });
  expect(res.statusCode).toBe(201);
  const { id } = res.json<JobView>();
  let unsubscribe = () => {};
  await new Promise<void>((resolve, reject) => {
    unsubscribe = svc.jobs.subscribe(id, (e: JobEvent) => {
      if (e.type === "ready") resolve();
      if (e.type === "failed") reject(new Error(e.error));
    });
  });
  unsubscribe();
  return (await app.inject({ url: `/api/jobs/${id}` })).json<JobView>();
}

describe("API", () => {
  it("lists samples and templates", async () => {
    const samples = (await app.inject({ url: "/api/samples" })).json<{ id: string }[]>();
    expect(samples.map((s) => s.id)).toEqual(["01", "02", "03", "04", "05"]);
    expect((await app.inject({ url: "/api/templates" })).json()).toContain("modern");
  });

  it("rejects unknown samples and templates", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/api/jobs",
      payload: { sampleId: "99", template: "modern" },
    });
    expect(bad.statusCode).toBe(404);
    const tpl = await app.inject({
      method: "POST",
      url: "/api/jobs",
      payload: { sampleId: "01", template: "nope" },
    });
    expect(tpl.statusCode).toBe(400);
  });

  it("generates a carousel with critique log and progress", async () => {
    const job = await readyJob();
    expect(job.status).toBe("ready");
    expect(job.plan?.slides.length).toBeGreaterThanOrEqual(6);
    expect(job.critique).toHaveLength(1);
    expect(job.progress).toContain("Carousel planned");
    const png = await app.inject({ url: `/api/jobs/${job.id}/slides/0.png` });
    expect(png.headers["content-type"]).toBe("image/png");
  });

  it("edits a slide, re-renders it and resets approval", async () => {
    const job = await readyJob();
    await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/approve`,
      payload: { shownFlagIds: [] },
    });
    const res = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${job.id}/slides/1`,
      payload: { headline: "A new headline" },
    });
    expect(res.statusCode).toBe(200);
    const view = res.json<JobView>();
    expect(view.plan?.slides[1]?.headline).toBe("A new headline");
    expect(view.slideVersions[1]).toBe(2);
    expect(view.approval).toBeNull();
  });

  it("rejects an edit that breaks the plan rules", async () => {
    const job = await readyJob();
    const cover = job.plan?.slides[0];
    const coverPhoto = cover?.type === "cover" ? cover.photo : "";
    const res = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${job.id}/slides/1`,
      payload: { photo: coverPhoto },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ details: string[] }>().details.join()).toContain(
      "use each photo at most once",
    );
  });

  it("regenerates a slide with a note", async () => {
    const job = await readyJob();
    const i = job.plan?.slides.findIndex((s) => s.type === "feature") ?? -1;
    const res = await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/slides/${i}/regenerate`,
      payload: { note: "more detail" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<JobView>().plan?.slides[i]).not.toEqual(job.plan?.slides[i]);
  });

  it("requires every compliance flag to be shown before approval", async () => {
    const job = await readyJob();
    const edited = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${job.id}/copy`,
      payload: { caption: "Perfect for young families. Four bedrooms." },
    });
    const flags = edited.json<JobView>().flags;
    expect(flags.map((f) => f.phrase)).toEqual(["Perfect for young families"]);

    const missing = await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/approve`,
      payload: { shownFlagIds: [] },
    });
    expect(missing.statusCode).toBe(409);
    const ok = await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/approve`,
      payload: { shownFlagIds: flags.map((f) => f.id) },
    });
    expect(ok.json<JobView>().approval?.flagIds).toEqual(flags.map((f) => f.id));
  });

  it("blocks approval while text overflows", async () => {
    overflowOnRender = ["headline: content is 900×300px but the box is 900×200px"];
    const job = await readyJob();
    const res = await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/approve`,
      payload: { shownFlagIds: [] },
    });
    expect(res.statusCode).toBe(409);
  });

  it("exports a ZIP only after approval", async () => {
    const job = await readyJob();
    const early = await app.inject({ url: `/api/jobs/${job.id}/export.zip` });
    expect(early.statusCode).toBe(409);

    await app.inject({
      method: "POST",
      url: `/api/jobs/${job.id}/approve`,
      payload: { shownFlagIds: [] },
    });
    const res = await app.inject({ url: `/api/jobs/${job.id}/export.zip` });
    expect(res.statusCode).toBe(200);
    const files = Object.keys(unzipSync(new Uint8Array(res.rawPayload)));
    expect(files).toContain("caption.txt");
    expect(files).toContain("alt-text.txt");
    expect(files.filter((f) => f.endsWith(".png"))).toHaveLength(job.plan?.slides.length ?? 0);
  });
});
