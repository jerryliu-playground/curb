import type { EditCopyRequest, EditSlideRequest, JobView, SampleSummary } from "@curb/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly details: string[],
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
    throw new ApiError(error.error ?? `Request failed (${res.status})`, error.details ?? []);
  }
  return (await res.json()) as T;
}

export const api = {
  samples: () => request<SampleSummary[]>("GET", "/api/samples"),
  templates: () => request<string[]>("GET", "/api/templates"),
  createJob: (sampleId: string, template: string) =>
    request<JobView>("POST", "/api/jobs", { sampleId, template }),
  job: (id: string) => request<JobView>("GET", `/api/jobs/${id}`),
  editSlide: (id: string, index: number, edit: EditSlideRequest) =>
    request<JobView>("PATCH", `/api/jobs/${id}/slides/${index}`, edit),
  regenerateSlide: (id: string, index: number, note: string) =>
    request<JobView>("POST", `/api/jobs/${id}/slides/${index}/regenerate`, { note }),
  editCopy: (id: string, edit: EditCopyRequest) =>
    request<JobView>("PATCH", `/api/jobs/${id}/copy`, edit),
  approve: (id: string, shownFlagIds: string[]) =>
    request<JobView>("POST", `/api/jobs/${id}/approve`, { shownFlagIds }),
  slideUrl: (job: JobView, index: number) =>
    `/api/jobs/${job.id}/slides/${index}.png?v=${job.slideVersions[index] ?? 0}`,
  photoUrl: (job: JobView, file: string) =>
    `/api/jobs/${job.id}/photos/${encodeURIComponent(file)}`,
  exportUrl: (job: JobView) => `/api/jobs/${job.id}/export.zip`,
};
