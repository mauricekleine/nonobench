import results from "@/app/results.json";

// A short, stable fingerprint of the current results export (FNV-1a, 64-bit),
// used to version URLs whose content follows the data, like the OG image.
function fingerprint(value: string) {
	let hash = 0xcbf29ce484222325n;
	for (const char of value) {
		hash ^= BigInt(char.codePointAt(0)!);
		hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
	}
	return hash.toString(16).padStart(16, "0");
}

export const RESULTS_VERSION = fingerprint(results.timestamp);
