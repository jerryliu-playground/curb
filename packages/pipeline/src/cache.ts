import { createHash } from "node:crypto";

/** Key-value cache for model results, e.g. photo analysis by image hash (SPEC.md §7). */
export interface ResultCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export function memoryCache(): ResultCache {
  const store = new Map<string, unknown>();
  return {
    get: (key) => Promise.resolve(store.get(key)),
    set: (key, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
  };
}

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
