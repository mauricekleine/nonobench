// Provider labels and bar colors are shared by the exporter and visualizer.
// Colors are chosen to remain visible against the site's void panels.
export const PROVIDERS: Record<string, { name: string; color: string }> = {
	openai: { name: "OpenAI", color: "#79D8B2" },
	anthropic: { name: "Anthropic", color: "#E9AA86" },
	google: { name: "Google", color: "#87B7FF" },
	"x-ai": { name: "xAI", color: "#D5D9E6" },
	deepseek: { name: "DeepSeek", color: "#8B9DFF" },
	qwen: { name: "Qwen", color: "#D7A4FF" },
	"z-ai": { name: "Z.ai", color: "#A6D994" },
	moonshotai: { name: "Moonshot AI", color: "#F5B8D1" },
	xiaomi: { name: "Xiaomi", color: "#FFAE78" },
	"bytedance-seed": { name: "ByteDance Seed", color: "#9CDDD9" },
	minimax: { name: "MiniMax", color: "#E7BC86" },
	mistralai: { name: "Mistral AI", color: "#F4B36D" },
	meta: { name: "Meta", color: "#8FBFFF" },
	allenai: { name: "Allen Institute for AI", color: "#B9CF83" },
};
