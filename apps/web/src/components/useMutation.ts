import type { JobView } from "@curb/shared";
import { useState } from "react";
import { ApiError } from "../api.ts";

/** Runs a job change, keeps the latest view, and exposes a readable error. */
export function useMutation(onJob: (job: JobView) => void) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (change: () => Promise<JobView>): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      onJob(await change());
      return true;
    } catch (e) {
      if (e instanceof ApiError) setError([e.message, ...e.details].join(" "));
      else setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setPending(false);
    }
  };
  return { run, error, pending };
}
