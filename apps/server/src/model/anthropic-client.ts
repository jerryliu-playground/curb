import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { type ModelClient, type ModelRequest, ModelResponseError } from "@curb/pipeline";

export const DEFAULT_MODEL = "claude-opus-5-5";

export interface AnthropicClientOptions {
  apiKey: string;
  model?: string;
  /** Log request metadata (never keys; prompts only when debug is on). */
  debug?: boolean;
  /** For tests: replaces the network call. */
  fetch?: typeof globalThis.fetch;
}

/**
 * The real ModelClient (ADR 0006). Uses JSON outputs (ADR 0007): the response is constrained to
 * the request's schema, then returned unvalidated so the pipeline's validate-and-retry applies
 * to real and mocked clients alike.
 */
export function createAnthropicModelClient(options: AnthropicClientOptions): ModelClient {
  const model = options.model ?? DEFAULT_MODEL;
  const client = new Anthropic({
    apiKey: options.apiKey,
    ...(options.fetch ? { fetch: options.fetch, maxRetries: 0 } : {}),
  });

  return {
    id: `anthropic:${model}`,
    async generate(request: ModelRequest) {
      const format = betaZodOutputFormat(request.schema);
      const content: Anthropic.Beta.BetaContentBlockParam[] = [
        ...request.images.map((image): Anthropic.Beta.BetaImageBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.base64 },
        })),
        { type: "text", text: request.prompt },
      ];
      if (options.debug) {
        console.error(
          `[model] ${request.step} ${JSON.stringify(request.meta ?? {})}\n${request.prompt}`,
        );
      }

      const response = await client.beta.messages.create({
        model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: "user", content }],
        output_config: {
          effort: request.effort,
          format: { type: "json_schema", schema: format.schema },
        },
        // Server-side refusal fallback: on a policy decline the API retries on its default
        // fallback model within the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (response.stop_reason === "refusal") {
        throw new ModelResponseError(`${request.step}: the model declined the request.`);
      }
      if (response.stop_reason === "max_tokens") {
        throw new ModelResponseError(
          `${request.step}: hit max_tokens (${request.maxTokens}) before finishing. Raise the cap in BUDGET if this repeats.`,
        );
      }
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      let output: unknown;
      try {
        output = JSON.parse(text);
      } catch {
        throw new ModelResponseError(`${request.step}: response was not valid JSON.`);
      }
      return {
        output,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
