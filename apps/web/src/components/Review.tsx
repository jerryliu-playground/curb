import { useState } from "react";
import { api } from "../api.ts";
import { useJob } from "../useJob.ts";
import { ApprovePanel } from "./ApprovePanel.tsx";
import { CompliancePanel } from "./CompliancePanel.tsx";
import { CopyEditor } from "./CopyEditor.tsx";
import { CritiqueLog } from "./CritiqueLog.tsx";
import { SlideEditor } from "./SlideEditor.tsx";

export function Review({ jobId }: { jobId: string }) {
  const { job, setJob, error } = useJob(jobId);
  const [selected, setSelected] = useState(0);

  if (!job) return <p className="muted">{error ?? "Loading…"}</p>;

  const title = `${job.listing.address.street}, ${job.listing.address.city}`;
  if (job.status !== "ready" || !job.plan) {
    return (
      <section className="progress" aria-live="polite">
        <h1>{title}</h1>
        {job.status === "failed" ? (
          <p className="error">Generation failed: {job.error}</p>
        ) : (
          <p>Generating…</p>
        )}
        <ol className="log">
          {job.progress.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>
    );
  }

  const plan = job.plan;
  const index = Math.min(selected, plan.slides.length - 1);
  return (
    <section className="review">
      <div className="review-head">
        <h1>{title}</h1>
        <span className="muted">
          {plan.slides.length} slides · {job.template}
          {job.busy ? " · updating…" : ""}
        </span>
      </div>

      <ol className="strip" aria-label="Slides">
        {plan.slides.map((slide, i) => (
          <li key={i}>
            <button
              type="button"
              className={`thumb${i === index ? " selected" : ""}${(job.overflow[i]?.length ?? 0) > 0 ? " warn" : ""}`}
              aria-label={`Slide ${i + 1}: ${slide.type}`}
              aria-current={i === index}
              onClick={() => setSelected(i)}
            >
              <img src={api.slideUrl(job, i)} alt={slide.altText} />
              <span>
                {i + 1}. {slide.type}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="workspace">
        <SlideEditor
          key={`${index}-${job.slideVersions[index] ?? 0}`}
          job={job}
          index={index}
          onJob={setJob}
        />
        <aside className="sidebar">
          <CompliancePanel job={job} />
          {/* Any change resets the "reviewed" tick, like it resets the approval. */}
          <ApprovePanel
            key={[
              ...job.flags.map((f) => f.id),
              ...job.slideVersions,
              plan.caption,
              ...plan.hashtags,
            ].join("|")}
            job={job}
            onJob={setJob}
          />
          <CopyEditor key={plan.caption + plan.hashtags.join()} job={job} onJob={setJob} />
          <CritiqueLog job={job} />
        </aside>
      </div>
    </section>
  );
}
