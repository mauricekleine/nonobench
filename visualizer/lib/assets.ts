// The exported datasets in public/ are static assets. The Worker has no
// filesystem, so the server reads them through the ASSETS binding and keeps
// each parsed dataset for the life of the isolate.

export type AssetFetcher = { fetch(input: Request | URL | string): Promise<Response> };

let assets: AssetFetcher | undefined;

export function bindAssets(binding: AssetFetcher) {
  assets = binding;
}

export async function readJsonAsset<T>(path: string): Promise<T> {
  if (!assets) throw new Error("The ASSETS binding is not configured.");
  const response = await assets.fetch(new URL(path, "https://assets.local"));
  if (!response.ok) throw new Error(`Asset ${path} returned HTTP ${response.status}.`);
  return (await response.json()) as T;
}

// Loads once and shares the promise; a failed load is retried on the next call.
export function cachedAsset<T, R = T>(
  path: string,
  select: (data: T) => R = (data) => data as unknown as R,
) {
  let pending: Promise<R> | undefined;
  return () =>
    (pending ??= readJsonAsset<T>(path)
      .then(select)
      .catch((error) => {
        pending = undefined;
        throw error;
      }));
}
