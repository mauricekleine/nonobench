// Provider labels and bar colors are shared by the exporter and visualizer.
// Colors are spread around the hue wheel with alternating lightness so every
// pair stays visibly distinct (min OKLab distance ~10 across all 14) and each
// clears 3:1 contrast on the void panels; logos and names carry identity too.
export const PROVIDERS: Record<string, { name: string; color: string }> = {
	openai: { name: "OpenAI", color: "#4FCB9C" },
	anthropic: { name: "Anthropic", color: "#CB7B48" },
	google: { name: "Google", color: "#65A7FA" },
	"x-ai": { name: "xAI", color: "#EDEEF2" },
	deepseek: { name: "DeepSeek", color: "#667CE5" },
	qwen: { name: "Qwen", color: "#D79AFC" },
	"z-ai": { name: "Z.ai", color: "#B0E562" },
	moonshotai: { name: "Moonshot AI", color: "#D871A1" },
	xiaomi: { name: "Xiaomi", color: "#FF9D71" },
	"bytedance-seed": { name: "ByteDance Seed", color: "#009FAC" },
	minimax: { name: "MiniMax", color: "#D14A65" },
	mistralai: { name: "Mistral AI", color: "#FACA4B" },
	meta: { name: "Meta", color: "#7DD9FC" },
	allenai: { name: "Allen Institute for AI", color: "#9C9E51" },
};
