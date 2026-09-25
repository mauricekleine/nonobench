import { markdownResponse, puzzlesMarkdown } from "@/lib/agent-docs";

export function GET() {
	return markdownResponse(puzzlesMarkdown());
}
