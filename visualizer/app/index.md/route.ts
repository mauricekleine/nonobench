import { homeMarkdown, markdownResponse } from "@/lib/agent-docs";

export function GET() {
	return markdownResponse(homeMarkdown());
}
