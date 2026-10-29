import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/server/errors";
import { assertSameOrigin, MAX_BODY_BYTES, readValidatedBody } from "@/lib/server/request";

const Schema = z.strictObject({ a: z.number() });
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://site.test/api/x", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });

describe("assertSameOrigin", () => {
  it("allows same-origin and no-origin requests, rejects cross-site", () => {
    expect(() => assertSameOrigin(post("{}", { "sec-fetch-site": "same-origin" }))).not.toThrow();
    expect(() => assertSameOrigin(post("{}"))).not.toThrow();
    expect(() => assertSameOrigin(post("{}", { "sec-fetch-site": "cross-site" }))).toThrow(
      AppError,
    );
    expect(() =>
      assertSameOrigin(post("{}", { origin: "https://evil.test", host: "site.test" })),
    ).toThrow(/FORBIDDEN_ORIGIN/);
    expect(() =>
      assertSameOrigin(post("{}", { origin: "https://site.test", host: "site.test" })),
    ).not.toThrow();
  });
});

describe("readValidatedBody", () => {
  it("parses a valid body and rejects unknown keys, bad JSON and oversized bodies", async () => {
    expect(await readValidatedBody(post('{"a":1}'), Schema)).toEqual({ a: 1 });
    await expect(readValidatedBody(post('{"a":1,"b":2}'), Schema)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(readValidatedBody(post("{nope"), Schema)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    const big = JSON.stringify({ a: 1, pad: "x".repeat(MAX_BODY_BYTES) });
    await expect(readValidatedBody(post(big), Schema)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });
});
