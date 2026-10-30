import { useState } from "react";
import { Review } from "./components/Review.tsx";
import { Start } from "./components/Start.tsx";

export function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setJobId(null)}>
          Curb
        </button>
        <span className="muted">Listing to Instagram carousel</span>
      </header>
      <main>{jobId ? <Review jobId={jobId} /> : <Start onStarted={setJobId} />}</main>
    </div>
  );
}
