import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { ProviderLogo } from "../brand/provider-logo";
import { C, clamp, FONT, PROVIDER_COLORS, snap } from "../brand/theme";
import { type Cue, Sfx } from "../brand/sfx";
import { EffortPill } from "../brand/ui";
import { FRAMES_PER_BAR, SCENE_BARS } from "../timing";

const ROWS = 8;
const rowStart = (i: number) => 12 + i * 5;

// A soft tick as each bar starts to grow, then a riser that peaks on the
// downbeat where Hard mode starts (the riser is about 2 s long).
const cues: Cue[] = [
	...Array.from({ length: ROWS }, (_, i) => ({ at: rowStart(i), sound: "tick", volume: 0.12 })),
	{ at: SCENE_BARS.leaderboard * FRAMES_PER_BAR - 60, sound: "riser.mp3", volume: 0.55 },
];
const TRACK = 640;

// The site's "model accuracy" card: provider-coloured bars on a faint track,
// thin 95% Wilson ranges, mono values.
export const Leaderboard: React.FC = () => {
	const frame = useCurrentFrame();
	const rows = NB.leaderboard.slice(0, ROWS);

	return (
		<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
			<Sfx cues={cues} />
			<div
				style={{
					width: 1640,
					padding: "44px 52px 30px",
					borderRadius: 28,
					background: "color-mix(in oklch, oklch(20% 0.035 278) 88%, transparent)",
					boxShadow: `inset 0 0 0 1.5px ${C.line}`,
					opacity: interpolate(frame, [0, 12], [0, 1], clamp),
					translate: interpolate(frame, [0, 22], ["0px 30px", "0px 0px"], { ...clamp, easing: snap }),
				}}
			>
				<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
					<div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 48, color: C.starlight, letterSpacing: "-0.02em" }}>model accuracy</div>
					<div style={{ fontFamily: FONT.mono, fontSize: 28, color: C.dim }}>
						{NB.counts.models} models · {NB.counts.variants} variants · Standard
					</div>
				</div>
				{rows.map((row, i) => {
					const start = rowStart(i);
					const grow = interpolate(frame, [start, start + 30], [0, 1], { ...clamp, easing: snap });
					const first = i === 0;
					return (
						<div
							key={row.name}
							style={{
								display: "flex",
								alignItems: "center",
								height: 84,
								borderTop: i === 0 ? "none" : `1px solid oklch(30% 0.03 278 / 0.6)`,
								opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 18, width: 580, flexShrink: 0, fontFamily: FONT.sans, fontSize: 36, color: C.starlight }}>
								<ProviderLogo provider={row.provider} size={32} style={{ color: C.starlight, flexShrink: 0 }} />
								<span style={{ whiteSpace: "nowrap" }}>{row.name}</span>
								<EffortPill>{row.effort}</EffortPill>
							</div>
							<div style={{ position: "relative", width: TRACK, flexShrink: 0, height: 40, borderRadius: 8, background: C.track }}>
								<div
									style={{
										position: "absolute",
										left: 0,
										top: 0,
										bottom: 0,
										width: TRACK * (row.accuracy / 100) * grow,
										borderRadius: 8,
										background: PROVIDER_COLORS[row.provider] ?? C.mutedInk,
										boxShadow: first ? `0 0 40px color-mix(in oklch, ${PROVIDER_COLORS[row.provider]} 45%, transparent)` : "none",
									}}
								/>
								<div
									style={{
										position: "absolute",
										top: "50%",
										height: 18,
										marginTop: -9,
										left: TRACK * (row.low / 100),
										width: TRACK * ((row.high - row.low) / 100),
										borderLeft: `2px solid ${C.starlight}`,
										borderRight: `2px solid ${C.starlight}`,
										opacity: interpolate(frame, [start + 24, start + 34], [0, 0.85], clamp),
									}}
								>
									<div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 2, background: C.starlight }} />
								</div>
							</div>
							<div style={{ flex: 1, paddingLeft: 24, textAlign: "right", fontFamily: FONT.mono, fontSize: 34, color: first ? C.starlight : C.mutedInk, whiteSpace: "nowrap" }}>
								{(row.accuracy * grow).toFixed(1)}%
								<span style={{ color: C.dim, fontSize: 26 }}>
									{" "}
									({Math.round(row.low)}–{Math.round(row.high)}%)
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
