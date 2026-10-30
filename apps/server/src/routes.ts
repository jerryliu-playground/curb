import { join } from "node:path";
import {
  ApproveRequestSchema,
  CreateJobRequestSchema,
  EditCopyRequestSchema,
  EditSlideRequestSchema,
  RegenerateSlideRequestSchema,
  type SampleSummary,
} from "@curb/shared";
import { TEMPLATES, type TemplateName } from "@curb/templates";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import type { z } from "zod";
import { HttpError } from "./http-error.ts";
import { listSamples, loadSample } from "./samples.ts";
import type { Services } from "./services.ts";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "The request isn't valid.",
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  return result.data;
}

function index(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new HttpError(404, "No such slide.");
  return n;
}

type IdParams = { Params: { id: string } };
type SlideParams = { Params: { id: string; index: string } };

export function registerRoutes(app: FastifyInstance, services: Services): void {
  const { jobs, config } = services;

  app.get("/api/samples", async (): Promise<SampleSummary[]> =>
    (await listSamples(config.samplesDir)).map((s) => ({
      id: s.id,
      street: s.listing.address.street,
      city: s.listing.address.city,
      priceCad: s.listing.price_cad,
      photoCount: s.photos.length,
    })),
  );

  app.get("/api/templates", () => Object.keys(TEMPLATES));

  app.post("/api/jobs", async (request, reply) => {
    const body = parse(CreateJobRequestSchema, request.body);
    if (!(body.template in TEMPLATES))
      throw new HttpError(400, `Unknown template "${body.template}".`);
    const sample = await loadSample(config.samplesDir, body.sampleId).catch(() => {
      throw new HttpError(404, "No such sample listing.");
    });
    const view = jobs.create(sample, body.template, TEMPLATES[body.template as TemplateName]);
    return reply.code(201).send(view);
  });

  app.get<IdParams>("/api/jobs/:id", (request) => jobs.view(request.params.id));

  app.get<IdParams>("/api/jobs/:id/events", (request, reply) => {
    jobs.view(request.params.id); // 404 before switching to a stream
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const unsubscribe = jobs.subscribe(request.params.id, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    request.raw.on("close", unsubscribe);
  });

  app.get<SlideParams>("/api/jobs/:id/slides/:index", (request, reply) =>
    reply
      .type("image/png")
      .header("cache-control", "no-cache")
      .send(
        Buffer.from(
          jobs.slidePng(request.params.id, index(request.params.index.replace(/\.png$/, ""))),
        ),
      ),
  );

  app.get<{ Params: { id: string; file: string } }>(
    "/api/jobs/:id/photos/:file",
    async (request, reply) => {
      const view = jobs.view(request.params.id);
      if (!view.photos.some((p) => p.file === request.params.file))
        throw new HttpError(404, "No such photo.");
      const sample = await loadSample(config.samplesDir, view.sampleId);
      const thumb = await sharp(join(sample.dir, request.params.file))
        .resize({ width: 480 })
        .jpeg({ quality: 80 })
        .toBuffer();
      return reply.type("image/jpeg").header("cache-control", "max-age=3600").send(thumb);
    },
  );

  app.patch<SlideParams>("/api/jobs/:id/slides/:index", (request) =>
    jobs.editSlide(
      request.params.id,
      index(request.params.index),
      parse(EditSlideRequestSchema, request.body),
    ),
  );

  app.post<SlideParams>("/api/jobs/:id/slides/:index/regenerate", (request) =>
    jobs.regenerateSlide(
      request.params.id,
      index(request.params.index),
      parse(RegenerateSlideRequestSchema, request.body).note,
    ),
  );

  app.patch<IdParams>("/api/jobs/:id/copy", (request) =>
    jobs.editCopy(request.params.id, parse(EditCopyRequestSchema, request.body)),
  );

  app.post<IdParams>("/api/jobs/:id/approve", (request) =>
    jobs.approve(request.params.id, parse(ApproveRequestSchema, request.body).shownFlagIds),
  );

  app.get<IdParams>("/api/jobs/:id/export.zip", (request, reply) => {
    const { filename, zip } = jobs.exportZip(request.params.id);
    return reply
      .type("application/zip")
      .header("content-disposition", `attachment; filename="${filename}"`)
      .send(Buffer.from(zip));
  });
}
