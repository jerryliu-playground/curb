import type { JobView } from "@curb/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { useMutation } from "./useMutation.ts";

export function ApprovePanel({ job, onJob }: { job: JobView; onJob: (j: JobView) => void }) {
  const [reviewed, setReviewed] = useState(false);
  const { run, error, pending } = useMutation(onJob);
  const overflowing = job.overflow.some((o) => o.length > 0);
  const needsAck = job.flags.length > 0;

  if (job.approval) {
    return (
      <section className="panel approved">
        <h2>Approved</h2>
        <p className="muted">Any change will need a new approval.</p>
        <a className="button primary" href={api.exportUrl(job)} download>
          Export ZIP
        </a>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Approve</h2>
      {overflowing ? <p className="error">Fix slides with text that doesn't fit first.</p> : null}
      {needsAck ? (
        <label className="check">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          I reviewed the {job.flags.length} compliance {job.flags.length === 1 ? "flag" : "flags"}
        </label>
      ) : null}
      <button
        type="button"
        className="primary"
        disabled={pending || job.busy || overflowing || (needsAck && !reviewed)}
        onClick={() =>
          void run(() =>
            api.approve(
              job.id,
              job.flags.map((f) => f.id),
            ),
          )
        }
      >
        Approve for export
      </button>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
