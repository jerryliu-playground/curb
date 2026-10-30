import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type ResultCache, sha256 } from "@curb/pipeline";

/** Stores cached model results as JSON files, one per key. */
export function fileCache(dir: string): ResultCache {
  const path = (key: string) => join(dir, `${sha256(key)}.json`);
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(path(key), "utf8")) as unknown;
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      await mkdir(dir, { recursive: true });
      await writeFile(path(key), JSON.stringify(value, null, 2));
    },
  };
}
