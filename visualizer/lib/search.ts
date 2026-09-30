// Flat query strings: every search param is a plain string, written the way
// nuqs writes them, so shared URLs such as /?p=openai,anthropic&r=true keep
// their exact form. TanStack Router's default would JSON-encode values.

export type SearchParams = Record<string, string | undefined>;

export function parseSearch(searchStr: string): SearchParams {
	return Object.fromEntries(new URLSearchParams(searchStr));
}

const encodeValue = (value: string) =>
	value
		.replace(/%/g, "%25")
		.replace(/\+/g, "%2B")
		.replace(/ /g, "+")
		.replace(/#/g, "%23")
		.replace(/&/g, "%26")
		.replace(/"/g, "%22")
		.replace(/'/g, "%27")
		.replace(/`/g, "%60")
		.replace(/</g, "%3C")
		.replace(/>/g, "%3E")
		// eslint-disable-next-line no-control-regex -- escapes control characters, as nuqs does
		.replace(/[\x00-\x1F]/g, (char) => encodeURIComponent(char));

export function stringifySearch(search: Record<string, unknown>): string {
	const query = Object.entries(search)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeValue(String(value))}`);
	return query.length ? `?${query.join("&")}` : "";
}

// validateSearch for routes that read their own keys from the URL.
export const stringSearch = <K extends string>() => (search: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(search).filter(([, value]) => typeof value === "string")) as Partial<Record<K, string>>;
