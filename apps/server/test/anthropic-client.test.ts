import { ModelResponseError } from "@curb/pipeline";
import { PhotoAnalysisOutputSchema } from "@curb/shared";
import { describe, expect, it } from "vitest";
import { createAnthropicModelClient } from "../src/model/anthropic-client.ts";

// No network: a fake fetch answers with canned API responses (CLAUDE.md rule 5).
function fakeApi(reply: { stop_reason: string; text: string }) {
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: url instanceof Request ? url.url : url.toString(),
      headers: new Headers(init?.headers),
      body: JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<
        string,
        unknown
      >,
    });
    const message = {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: reply.text }],
      stop_reason: reply.stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 120, output_tokens: 30 },
    };
    return Promise.resolve(
      new Response(JSON.stringify(message), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  return { fetch, requests };
}

const request = {
  step: "photo-analysis" as const,
  system: "system prompt",
  prompt: "analyze",
  images: [{ mediaType: "image/jpeg" as const, base64: "AAAA" }],
  schema: PhotoAnalysisOutputSchema,
  maxTokens: 4000,
  effort: "low" as const,
};

describe("Anthropic model client", () => {
  it("sends a JSON-outputs request with the image, effort and refusal fallback", async () => {
    const api = fakeApi({ stop_reason: "end_turn", text: '{"roomType":"kitchen"}' });
    const client = createAnthropicModelClient({ apiKey: "test-key", fetch: api.fetch });
    const response = await client.generate(request);

    expect(response.output).toEqual({ roomType: "kitchen" });
    expect(response.usage).toEqual({ inputTokens: 120, outputTokens: 30 });
    const sent = api.requests[0];
    expect(sent?.body.model).toBe("claude-opus-5-5");
    expect(sent?.body.max_tokens).toBe(4000);
    expect(sent?.body.fallbacks).toBe("default");
    expect(sent?.headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    const config = sent?.body.output_config as {
      effort: string;
      format: { type: string; schema: object };
    };
    expect(config.effort).toBe("low");
    expect(config.format.type).toBe("json_schema");
    expect(JSON.stringify(sent?.body.messages)).toContain('"media_type":"image/jpeg"');
    expect(sent?.body).not.toHaveProperty("temperature");
  });

  it.each([
    ["refusal", "declined"],
    ["max_tokens", "max_tokens"],
  ])("treats stop_reason %s as a failure", async (stop_reason, message) => {
    const api = fakeApi({ stop_reason, text: "{}" });
    const client = createAnthropicModelClient({ apiKey: "k", fetch: api.fetch });
    const error = await client.generate(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ModelResponseError);
    expect((error as Error).message).toContain(message);
  });

  it("rejects a response that isn't JSON", async () => {
    const api = fakeApi({ stop_reason: "end_turn", text: "not json" });
    const client = createAnthropicModelClient({ apiKey: "k", fetch: api.fetch });
    await expect(client.generate(request)).rejects.toThrow("not valid JSON");
  });
});
