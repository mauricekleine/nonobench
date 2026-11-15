// The exported datasets in public/ are static assets. The Worker has no
// filesystem, so the server reads them through the ASSETS binding and keeps
// each parsed dataset for the life of the isolate.

export type AssetFetcher = { fetch(input: Request | URL | string): Promise<Response> };

let assets: AssetFetcher | undefined;

export function bindAssets(binding: AssetFetcher) {
  assets = binding;
}

// The asset could not be read in time; the API answers 503 and the next call retries.
export class AssetUnavailableError extends Error {}

export async function readJsonAsset<T>(path: string): Promise<T> {
  if (!assets) throw new Error("The ASSETS binding is not configured.");
  const response = await assets.fetch(new URL(path, "https://assets.local"));
  if (!response.ok)
    throw new AssetUnavailableError(`Asset ${path} returned HTTP ${response.status}.`);
  return (await response.json()) as T;
}

// Generous for the 13.5 MB raw export, which loads in a few seconds.
const LOAD_TIMEOUT_MS = 10_000;

// Loads once and shares the promise; a failed load is retried on the next call.
// The load runs in the I/O context of the request that started it, so if that
// request is cancelled the promise may never settle. Each caller therefore
// waits at most timeoutMs, and a timed-out load is dropped so the next call
// starts a fresh one.
export function cachedAsset<T, R = T>(
  path: string,
  select: (data: T) => R = (data) => data as unknown as R,
  timeoutMs = LOAD_TIMEOUT_MS,
) {
  let pending: Promise<R> | undefined;
  const drop = (attempt: Promise<R>) => {
    if (pending === attempt) pending = undefined;
  };
  return async () => {
    if (!pending) {
      const attempt = readJsonAsset<T>(path).then(select);
      attempt.catch(() => drop(attempt));
      pending = attempt;
    }
    const attempt = pending;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        drop(attempt);
        reject(new AssetUnavailableError(`Asset ${path} did not load within ${timeoutMs} ms.`));
      }, timeoutMs);
    });
    try {
      return await Promise.race([attempt, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}
