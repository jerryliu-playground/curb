import { type JobView, locationLabel } from "@curb/shared";

/** Compliance flags are always visible while reviewing (CLAUDE.md rule 8). */
export function CompliancePanel({ job }: { job: JobView }) {
  return (
    <section className="panel" aria-labelledby="compliance-title">
      <h2 id="compliance-title">
        Compliance{" "}
        {job.flags.length > 0 ? <span className="badge warn">{job.flags.length}</span> : null}
      </h2>
      {job.flags.length === 0 ? (
        <p className="muted">No flags. The copy describes the property, not the buyer.</p>
      ) : (
        <ul className="flags">
          {job.flags.map((f) => (
            <li key={f.id}>
              <strong>{locationLabel(f.location)}:</strong> “{f.phrase}”
              <br />
              <span className="muted">
                {f.reason} ({f.source === "word-list" ? "word list" : "model check"})
              </span>
              <br />
              Suggestion: {f.suggestion}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
