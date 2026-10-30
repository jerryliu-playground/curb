import type { JobEvent, JobView } from "@curb/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";

/** Loads a job and keeps it fresh from the server's SSE stream. */
export function useJob(id: string) {
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.job(id).then(setJob, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => {
    refresh();
    const source = new EventSource(`/api/jobs/${id}/events`);
    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as JobEvent;
      if (event.type === "failed") setError(event.error);
      refresh();
    };
    return () => source.close();
  }, [id, refresh]);

  return { job, setJob, error };
}
