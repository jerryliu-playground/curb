import type { JobView } from "@curb/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { useMutation } from "./useMutation.ts";

export function CopyEditor({ job, onJob }: { job: JobView; onJob: (j: JobView) => void }) {
  const [caption, setCaption] = useState(job.plan?.caption ?? "");
  const [hashtags, setHashtags] = useState(job.plan?.hashtags.join(" ") ?? "");
  const { run, error, pending } = useMutation(onJob);

  const save = () =>
    run(() => api.editCopy(job.id, { caption, hashtags: hashtags.split(/\s+/).filter(Boolean) }));

  return (
    <section className="panel">
      <h2>Caption</h2>
      <label className="field">
        Caption <span className="count">{caption.length}/1000</span>
        <textarea
          value={caption}
          rows={6}
          maxLength={1000}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <label className="field">
        Hashtags
        <textarea value={hashtags} rows={2} onChange={(e) => setHashtags(e.target.value)} />
      </label>
      <button type="button" disabled={pending || job.busy} onClick={() => void save()}>
        Save caption
      </button>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
