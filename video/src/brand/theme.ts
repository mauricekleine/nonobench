import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";
import { loadFont as loadFragmentMono } from "@remotion/google-fonts/FragmentMono";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { Easing } from "remotion";

// The site's "Superthread void mode" tokens (visualizer/app/globals.css): night
// ground, warm starlight text, ember as the one accent thread. The grid-size
// colours are data categories, never accents.
export const C = {
	night: "oklch(17% 0.035 275)",
	nightDeep: "oklch(13% 0.03 280)",
	panel: "oklch(20% 0.035 278)",
	line: "oklch(30% 0.03 278)",
	lineStrong: "oklch(40% 0.03 278)",
	starlight: "oklch(94% 0.01 85)",
	mutedInk: "oklch(76% 0.02 275)",
	dim: "oklch(66% 0.015 275)",
	ember: "oklch(75% 0.13 55)",
	emberBright: "oklch(84% 0.12 65)",
	emptyCell: "oklch(94% 0.01 85 / 0.07)",
	emptyRing: "oklch(94% 0.01 85 / 0.1)",
	track: "oklch(94% 0.01 85 / 0.06)",
} as const;

export const SIZE_COLORS = {
	"5x5": "#70B8FF",
	"10x10": "#46FEA5",
	"15x15": "#FFCA16",
	"20x20": "#C69CFF",
} as const;

export type Size = keyof typeof SIZE_COLORS;

// lib/providers.ts: bar colours per provider.
export const PROVIDER_COLORS: Record<string, string> = {
	openai: "#4FCB9C",
	anthropic: "#CB7B48",
	google: "#65A7FA",
	"x-ai": "#EDEEF2",
	deepseek: "#667CE5",
	qwen: "#D79AFC",
	"z-ai": "#B0E562",
	moonshotai: "#D871A1",
	xiaomi: "#FF9D71",
	"bytedance-seed": "#009FAC",
	minimax: "#D14A65",
	mistralai: "#FACA4B",
	meta: "#7DD9FC",
	allenai: "#9C9E51",
};

// Type roles from app/layout.tsx: a wide display face for the wordmark and
// headings, a warm sans for body, Fragment Mono for numbers and meta.
export const FONT = {
	display: loadUnbounded("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily,
	sans: loadFigtree("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily,
	mono: loadFragmentMono("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
};

// --ease-snap from globals.css.
export const snap = Easing.bezier(0.22, 1, 0.36, 1);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function sizeLabel(size: string) {
	return size.replace("x", "×");
}
