import type { SampleSummary } from "@curb/shared";
import { useEffect, useState } from "react";
import { api } from "../api.ts";

const price = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function Start({ onStarted }: { onStarted: (jobId: string) => void }) {
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [template, setTemplate] = useState("modern");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([api.samples(), api.templates()]).then(
      ([s, t]) => {
        setSamples(s);
        setTemplates(t);
        setSampleId(s[0]?.id ?? null);
      },
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  const start = async () => {
    if (!sampleId) return;
    setStarting(true);
    setError(null);
    try {
      onStarted((await api.createJob(sampleId, template)).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  };

  return (
    <section className="start">
      <h1>Pick a listing</h1>
      <div className="sample-grid" role="radiogroup" aria-label="Sample listings">
        {samples.map((s) => (
          <button
            type="button"
            key={s.id}
            role="radio"
            aria-checked={s.id === sampleId}
            className={`sample${s.id === sampleId ? " selected" : ""}`}
            onClick={() => setSampleId(s.id)}
          >
            <strong>{s.street}</strong>
            <span>{s.city}</span>
            <span>{price.format(s.priceCad)}</span>
            <span className="muted">{s.photoCount} photos</span>
          </button>
        ))}
      </div>
      <label className="field inline">
        Template
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {templates.map((t) => (
            <option key={t} value={t}>
              {t[0]?.toUpperCase()}
              {t.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="primary"
        disabled={!sampleId || starting}
        onClick={() => void start()}
      >
        {starting ? "Starting…" : "Generate"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
