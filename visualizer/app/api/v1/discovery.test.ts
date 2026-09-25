import { expect, test } from "bun:test";
import { GET as providers } from "./providers/route";
import { GET as families } from "./families/route";

test("provider discovery reports families and variant counts", async () => {
  const body = await providers().json();
  const openai = body.providers.find(
    (provider: { id: string }) => provider.id === "openai",
  );
  expect(openai.name).toBe("OpenAI");
  expect(openai.families.length).toBeGreaterThan(0);
  expect(openai.variantCount).toBeGreaterThanOrEqual(openai.families.length);
});

test("family discovery reports the selected best variant", async () => {
  const body = await families().json();
  const opus = body.families.find(
    (family: { family: string }) => family.family === "claude-opus-5.5",
  );
  expect(opus.displayName).toBe("Claude Opus 5.5");
  expect(opus.bestVariant).toBeTruthy();
  expect(opus.efforts.length).toBeGreaterThan(0);
});
