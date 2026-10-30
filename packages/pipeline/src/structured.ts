import type { z } from "zod";
import { BUDGET } from "./budget.ts";
import type { ModelClient, ModelRequest } from "./model-client.ts";

export class ValidationFailedError extends Error {
  override name = "ValidationFailedError";
  constructor(
    readonly step: string,
    readonly problems: string[],
  ) {
    super(
      `${step}: model output failed validation after ${BUDGET.maxAttempts} attempts:\n- ${problems.join("\n- ")}`,
    );
  }
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

function zodProblems(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

/**
 * Calls the model and validates the output against `request.schema`, plus optional extra checks.
 * On failure, retries once with the problems appended to the prompt, then throws
 * (CLAUDE.md rule 1: never silently accept malformed output).
 */
export async function generateValidated<T>(
  client: ModelClient,
  request: ModelRequest & { schema: z.ZodType<T> },
  extraChecks: (value: T) => string[] = () => [],
  usage?: Usage,
): Promise<T> {
  let prompt = request.prompt;
  let problems: string[] = [];

  for (let attempt = 1; attempt <= BUDGET.maxAttempts; attempt++) {
    const response = await client.generate({ ...request, prompt });
    if (usage) {
      usage.inputTokens += response.usage.inputTokens;
      usage.outputTokens += response.usage.outputTokens;
    }
    const parsed = request.schema.safeParse(response.output);
    problems = parsed.success ? extraChecks(parsed.data) : zodProblems(parsed.error);
    if (parsed.success && problems.length === 0) return parsed.data;

    prompt =
      `${request.prompt}\n\nYour previous response was rejected for these reasons:\n` +
      `${problems.map((p) => `- ${p}`).join("\n")}\nReturn a corrected response.`;
  }
  throw new ValidationFailedError(request.step, problems);
}
