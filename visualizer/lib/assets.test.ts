import { expect, test } from "bun:test";

import { AssetUnavailableError, bindAssets, cachedAsset } from "./assets";

const json = (data: unknown) => new Response(JSON.stringify(data));

test("a load abandoned with its request does not hang later callers", async () => {
  // When the request that starts a load is cancelled, the runtime drops that
  // load's I/O and its promise never settles. The stub models that with a
  // first fetch that never answers.
  let fetches = 0;
  bindAssets({
    fetch: () => (++fetches === 1 ? new Promise<Response>(() => {}) : Promise.resolve(json([1]))),
  });
  const load = cachedAsset<number[]>("/abandoned.json", undefined, 20);

  // The first caller and one already waiting on the same load both give up.
  const stalled = await Promise.allSettled([load(), load()]);
  for (const outcome of stalled) {
    expect(outcome.status).toBe("rejected");
    expect((outcome as PromiseRejectedResult).reason).toBeInstanceOf(AssetUnavailableError);
  }
  expect(await load()).toEqual([1]);
  expect(await load()).toEqual([1]);
  expect(fetches).toBe(2);
});

test("concurrent callers share one load and a failed load is retried", async () => {
  let fetches = 0;
  bindAssets({
    fetch: async () =>
      ++fetches === 1 ? new Response("down", { status: 500 }) : json({ value: fetches }),
  });
  const load = cachedAsset("/shared.json", (data: { value: number }) => data.value, 1000);

  await expect(load()).rejects.toBeInstanceOf(AssetUnavailableError);
  expect(await Promise.all([load(), load()])).toEqual([2, 2]);
  expect(fetches).toBe(2);
});
