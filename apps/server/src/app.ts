import Fastify, { type FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get("/health", () => ({ ok: true }));
  return app;
}
