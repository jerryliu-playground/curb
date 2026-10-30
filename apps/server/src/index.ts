import { fileURLToPath } from "node:url";
import { buildApp } from "./app.ts";
import { readConfig } from "./config.ts";
import { createServices } from "./services.ts";

// pnpm runs package scripts from apps/server; resolve samples and cache from the repo root.
const config = readConfig(
  process.env,
  process.env.CURB_ROOT ?? fileURLToPath(new URL("../../..", import.meta.url)),
);
const services = createServices(config);
const app = buildApp(services);

app
  .listen({ port: config.port, host: "127.0.0.1" })
  .then(() =>
    console.log(`Curb server on http://127.0.0.1:${config.port} (model: ${config.model})`),
  )
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(services.close)
      .finally(() => process.exit(0));
  });
}
