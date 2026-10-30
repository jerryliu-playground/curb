import { resolve } from "node:path";

/** Server configuration, read once from the environment (CLAUDE.md rule 4: only here and the CLI). */
export interface ServerConfig {
  port: number;
  samplesDir: string;
  cacheDir: string;
  /** "mock" runs the deterministic sample client; "anthropic" calls the real API. */
  model: "mock" | "anthropic";
  anthropicApiKey: string | undefined;
  debug: boolean;
}

export function readConfig(
  env: NodeJS.ProcessEnv = process.env,
  root = process.cwd(),
): ServerConfig {
  const model = env.CURB_MODEL === "anthropic" ? "anthropic" : "mock";
  if (model === "anthropic" && !env.ANTHROPIC_API_KEY) {
    throw new Error("CURB_MODEL=anthropic needs ANTHROPIC_API_KEY.");
  }
  return {
    // Not PORT: dev tooling sets PORT for the web app, and Vite proxies /api to 3001.
    port: Number(env.CURB_SERVER_PORT ?? 3001),
    samplesDir: resolve(root, env.CURB_SAMPLES_DIR ?? "samples"),
    cacheDir: resolve(root, env.CURB_CACHE_DIR ?? ".cache"),
    model,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    debug: env.CURB_DEBUG === "1",
  };
}
