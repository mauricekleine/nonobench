import { SITE_URL } from "@/lib/data";

// RFC 9727 API catalog.
export function GET() {
	return new Response(
		JSON.stringify({
			linkset: [
				{
					anchor: `${SITE_URL}/api/v1`,
					"service-desc": [{ href: `${SITE_URL}/api/openapi.json`, type: "application/json" }],
					"service-doc": [{ href: `${SITE_URL}/llms.txt`, type: "text/plain" }],
					status: [{ href: `${SITE_URL}/api/health`, type: "application/json" }],
				},
			],
		}),
		{
			headers: {
				"Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
			},
		},
	);
}
