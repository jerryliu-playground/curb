import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidated, ValidationFailedError } from "../src/index.ts";
import { createScriptedModelClient } from "../src/testing/index.ts";

const schema = z.strictObject({ headline: z.string().max(10) });
const request = {
  step: "carousel-plan" as const,
  system: "sys",
  prompt: "Write a headline.",
  images: [],
  schema,
  maxTokens: 100,
  effort: "low" as const,
};

describe("generateValidated", () => {
  it("returns valid output on the first try", async () => {
    const client = createScriptedModelClient(() => ({ headline: "Hello" }));
    await expect(generateValidated(client, request)).resolves.toEqual({ headline: "Hello" });
    expect(client.calls).toHaveLength(1);
  });

  it("retries once with the validation error in the prompt", async () => {
    const client = createScriptedModelClient((_req, i) =>
      i === 0 ? { headline: "Far too long a headline" } : { headline: "Short" },
    );
    await expect(generateValidated(client, request)).resolves.toEqual({ headline: "Short" });
    expect(client.calls).toHaveLength(2);
    expect(client.calls[1]?.prompt).toContain("Your previous response was rejected");
    expect(client.calls[1]?.prompt).toContain("headline:");
  });

  it("fails loudly after the retry", async () => {
    const client = createScriptedModelClient(() => ({ headline: 42 }));
    const error = await generateValidated(client, request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationFailedError);
    expect((error as ValidationFailedError).problems[0]).toMatch(/^headline:/);
    expect(client.calls).toHaveLength(2);
  });

  it("applies extra checks the schema can't express", async () => {
    const client = createScriptedModelClient((_req, i) => ({ headline: i === 0 ? "bad" : "good" }));
    const result = await generateValidated(client, request, (v) =>
      v.headline === "bad" ? ["Headline must not be bad."] : [],
    );
    expect(result).toEqual({ headline: "good" });
    expect(client.calls[1]?.prompt).toContain("- Headline must not be bad.");
  });
});
