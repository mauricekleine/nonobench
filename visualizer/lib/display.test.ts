import { expect, test } from "bun:test";
import { effortDescription, effortLabel, effortTitle, formatDuration } from "./display";

test("durations use readable units and rounded boundaries", () => {
  expect(formatDuration(12_400)).toBe("12.4s");
  expect(formatDuration(2_936_000)).toBe("48m 56s");
  expect(formatDuration(13_680_000)).toBe("3h 48m");
  expect(formatDuration(900)).toBe("900ms");
});

test("provider default reasoning is presented as on", () => {
  expect(effortLabel("default")).toBe("on");
  expect(effortDescription("default")).toBe("reasoning on");
  expect(effortTitle("default")).toContain("no adjustable reasoning levels");
  expect(effortLabel("high")).toBe("high");
});
