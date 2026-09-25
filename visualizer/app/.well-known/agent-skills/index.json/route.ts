import { createHash } from "node:crypto";

import { skillMd } from "@/lib/agent-docs";
import { SITE_URL } from "@/lib/data";

// Agent Skills Discovery RFC v0.2.0.
export function GET() {
	return Response.json({
		$schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
		skills: [
			{
				name: "nonobench",
				type: "skill-md",
				description:
					"Look up NonoBench results (how well LLMs solve nonogram puzzles), fetch the benchmark puzzles, and check nonogram solutions.",
				url: `${SITE_URL}/.well-known/agent-skills/nonobench/SKILL.md`,
				digest: `sha256:${createHash("sha256").update(skillMd()).digest("hex")}`,
			},
		],
	});
}
