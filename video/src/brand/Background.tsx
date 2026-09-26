import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { C, clamp } from "./theme";

// Film grain, the site's .noise-overlay recipe. Static, like the site: this is
// an instrument, so the grain does not animate.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// The site's room, scaled for 1080p: night gradient, nonogram paper (square
// cells, a heavier rule every fifth line) fading out from the top-left corner,
// and one faint ember glow. The paper drifts very slowly so the frame breathes.
export const Background: React.FC = () => {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();
	const drift = interpolate(frame, [0, durationInFrames], [0, -160], clamp);

	return (
		<AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.night} 0%, ${C.nightDeep} 100%)` }}>
			<AbsoluteFill
				style={{
					backgroundImage: [
						"linear-gradient(to right, oklch(94% 0.01 85 / 0.075) 1px, transparent 1px)",
						"linear-gradient(to bottom, oklch(94% 0.01 85 / 0.075) 1px, transparent 1px)",
						"linear-gradient(to right, oklch(94% 0.01 85 / 0.035) 1px, transparent 1px)",
						"linear-gradient(to bottom, oklch(94% 0.01 85 / 0.035) 1px, transparent 1px)",
					].join(", "),
					backgroundSize: "200px 200px, 200px 200px, 40px 40px, 40px 40px",
					backgroundPosition: `${drift - 1}px ${drift - 1}px`,
					maskImage: "radial-gradient(ellipse 95% 80% at 0% 0%, black 0%, transparent 72%)",
				}}
			/>
			<AbsoluteFill style={{ background: "radial-gradient(60% 50% at 10% 0%, oklch(75% 0.13 55 / 0.09), transparent 70%)" }} />
		</AbsoluteFill>
	);
};

export const Grain: React.FC = () => (
	<AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "overlay", backgroundImage: NOISE, pointerEvents: "none" }} />
);
