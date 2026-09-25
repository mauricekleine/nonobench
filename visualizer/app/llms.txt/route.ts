import { llmsTxt } from "@/lib/agent-docs";

export function GET() {
	return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
