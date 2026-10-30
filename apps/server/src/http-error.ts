/** An error with an HTTP status and user-facing message (short and plain). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}
