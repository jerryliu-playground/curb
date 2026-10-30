import type { JobView } from "@curb/shared";

export function CritiqueLog({ job }: { job: JobView }) {
  return (
    <section className="panel">
      <h2>Critique</h2>
      {job.critique.map((round) => (
        <div key={round.round} className="round">
          <strong>Round {round.round}</strong>: {round.summary}
          {round.changes.length > 0 ? (
            <ul>
              {round.changes.map((c, i) => (
                <li key={i}>
                  Slide {c.slide + 1} {c.field}: “{c.from}” → “{c.to}”
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}
