import { markdownResponse, skillMd } from "@/lib/agent-docs";

export function GET() {
	return markdownResponse(skillMd());
}
