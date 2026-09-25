import { SITE_URL } from "@/lib/data";

// Hand-written rather than app/robots.ts because Next's robots metadata has
// no field for Content-Signal. ai-train=no keeps the published puzzles and
// answers out of training sets, which would contaminate the benchmark.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=no";

const AI_CRAWLERS = [
	"GPTBot",
	"OAI-SearchBot",
	"ChatGPT-User",
	"ClaudeBot",
	"Claude-Web",
	"Claude-SearchBot",
	"Claude-User",
	"Google-Extended",
	"PerplexityBot",
	"Perplexity-User",
	"Applebot-Extended",
	"CCBot",
	"meta-externalagent",
	"Bytespider",
];

const body = `# Nonobench: LLM nonogram benchmark. Agents: see ${SITE_URL}/llms.txt

User-agent: *
${CONTENT_SIGNAL}
Allow: /

# AI crawlers may read and cite everything; the Content-Signal asks that the
# content is not used for model training.
${AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join("\n")}
${CONTENT_SIGNAL}
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function GET() {
	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
