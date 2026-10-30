import Fastify, { type FastifyInstance } from "fastify";
import { HttpError } from "./http-error.ts";
import { registerRoutes } from "./routes.ts";
import type { Services } from "./services.ts";

export function buildApp(services?: Services): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.status).send({ error: error.message, details: error.details });
    }
    // Model and validation failures surface as a plain message; never echo prompts or keys.
    console.error(error);
    return reply
      .code(500)
      .send({ error: "Something went wrong. Check the server log.", details: [] });
  });

  app.get("/health", () => ({ ok: true }));
  if (services) registerRoutes(app, services);
  return app;
}
