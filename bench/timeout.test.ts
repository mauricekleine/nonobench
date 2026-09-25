import { expect, test } from "bun:test";
import { isProviderTimeout } from "./timeout";

test("provider timeout requires both error evidence and elapsed time", () => {
  const nearLimit = 296_000;
  for (const error of [
    new Error("Network connection lost"),
    Object.assign(new Error("aborted"), { name: "AbortError" }),
    new Error("request timed out"),
    { status: 504, message: "gateway" },
    { statusCode: 408, message: "request failed" },
    { response: { status: 504 }, message: "request failed" },
    { message: "request failed", cause: new Error("ECONNRESET") },
    "Network connection lost",
  ]) {
    expect(isProviderTimeout(error, nearLimit, 300)).toBe(true);
    expect(isProviderTimeout(error, 294_999, 300)).toBe(false);
  }
  expect(isProviderTimeout(new Error("Provider rejected schema"), nearLimit, 300)).toBe(false);
  expect(isProviderTimeout(new Error("Network connection lost"), nearLimit)).toBe(false);
});
