import type { JobView } from "@curb/shared";
import { useState } from "react";
import { api } from "../api.ts";
import { useMutation } from "./useMutation.ts";

export function SlideEditor({
  job,
  index,
  onJob,
}: {
  job: JobView;
  index: number;
  onJob: (j: JobView) => void;
}) {
  const slide = job.plan?.slides[index];
  const [headline, setHeadline] = useState(slide?.headline ?? "");
  const [body, setBody] = useState(slide && "body" in slide ? slide.body : "");
  const [altText, setAltText] = useState(slide?.altText ?? "");
  const [note, setNote] = useState("");
  const { run, error, pending } = useMutation(onJob);
  if (!slide || !job.plan) return null;

  const hasBody = "body" in slide;
  const busy = pending || job.busy;
  const usedPhotos = new Set(
    job.plan.slides.flatMap((s, i) =>
      i === index ? [] : s.type === "gallery" ? s.photos : s.photo ? [s.photo] : [],
    ),
  );
  const swappable = slide.type !== "gallery";
  const currentPhoto = slide.type === "gallery" ? null : slide.photo;
  const overflow = job.overflow[index] ?? [];

  const save = () =>
    run(() =>
      api.editSlide(job.id, index, {
        ...(headline !== slide.headline ? { headline } : {}),
        ...(hasBody && body !== slide.body ? { body } : {}),
        ...(altText !== slide.altText ? { altText } : {}),
      }),
    );

  return (
    <div className="editor">
      <img className="preview" src={api.slideUrl(job, index)} alt={slide.altText} />
      <div className="editor-form">
        <h2>
          Slide {index + 1} <span className="muted">· {slide.type}</span>
        </h2>
        {overflow.length > 0 ? (
          <p className="error" role="alert">
            Text doesn't fit: {overflow.join("; ")}
          </p>
        ) : null}
        <label className="field">
          Headline <span className="count">{headline.length}/40</span>
          <input value={headline} maxLength={40} onChange={(e) => setHeadline(e.target.value)} />
        </label>
        {hasBody ? (
          <label className="field">
            Body{" "}
            <span className="count">
              {body.length}/{slide.type === "cta" ? 100 : 140}
            </span>
            <textarea
              value={body}
              rows={3}
              maxLength={slide.type === "cta" ? 100 : 140}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
        ) : null}
        <label className="field">
          Alt text <span className="count">{altText.length}/200</span>
          <textarea
            value={altText}
            rows={2}
            maxLength={200}
            onChange={(e) => setAltText(e.target.value)}
          />
        </label>
        <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
          Save changes
        </button>

        <h3>Regenerate</h3>
        <div className="row">
          <input
            aria-label="Note for the new version"
            placeholder='e.g. "make this one about the kitchen"'
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => api.regenerateSlide(job.id, index, note))}
          >
            Regenerate
          </button>
        </div>

        {swappable ? (
          <>
            <h3>Photo</h3>
            <div className="photos" role="radiogroup" aria-label="Swap photo">
              {job.photos
                .filter((p) => !usedPhotos.has(p.file))
                .map((p) => (
                  <button
                    type="button"
                    key={p.file}
                    role="radio"
                    aria-checked={p.file === currentPhoto}
                    aria-label={`${p.roomType.replace(/_/g, " ")} (${p.file})`}
                    className={`photo${p.file === currentPhoto ? " selected" : ""}`}
                    disabled={busy || p.file === currentPhoto}
                    onClick={() => void run(() => api.editSlide(job.id, index, { photo: p.file }))}
                  >
                    <img src={api.photoUrl(job, p.file)} alt="" />
                  </button>
                ))}
            </div>
          </>
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
