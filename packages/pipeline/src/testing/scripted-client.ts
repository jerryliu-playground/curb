import type { ModelClient, ModelRequest, ModelResponse } from "../model-client.ts";

export interface ScriptedClient extends ModelClient {
  readonly calls: ModelRequest[];
}

/** A mocked ModelClient whose answers come from `respond`. Records every request. */
export function createScriptedModelClient(
  respond: (request: ModelRequest, callIndex: number) => unknown,
  id = "mock:scripted",
): ScriptedClient {
  const calls: ModelRequest[] = [];
  return {
    id,
    calls,
    generate(request): Promise<ModelResponse> {
      calls.push(request);
      const output = respond(request, calls.length - 1);
      return Promise.resolve({ output, usage: { inputTokens: 0, outputTokens: 0 } });
    },
  };
}
