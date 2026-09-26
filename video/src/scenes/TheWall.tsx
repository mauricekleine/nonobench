import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { NB } from "../data";
import { ProviderLogo } from "../brand/provider-logo";
import { C, clamp, FONT, PROVIDER_COLORS, SIZE_COLORS, sizeLabel, snap } from "../brand/theme";
import { type Cue, pluck, Sfx } from "../brand/sfx";
import { EffortPill, Headline } from "../brand/ui";

const WHEN: Record<string, string> = { "1.0": "jan", "1.1": "mar", "1.2": "sep" };

// When each version's row appears and fills. The v1.2 row takes its time.
function rowTiming(row: number) {
	const start = 50 + row * 36;
	const last = row === NB.fifteenRecords.length - 1;
	const fillFrom = start + 10;
	const fillTo = fillFrom + (last ? 44 : 14);
	const cellAt = (i: number, total: number) => fillFrom + (i / total) * (fillTo - fillFrom);
	return { start, last, fillFrom, fillTo, cellAt };
}

// Every solved 15x15 plucks one step up, so the v1.2 row climbs past the others.
const cues: Cue[] = NB.fifteenRecords.flatMap((record, row) => {
	const { last, cellAt } = rowTiming(row);
	return Array.from({ length: record.correct }, (_, i) => ({ at: cellAt(i, record.total), sound: pluck(5 + i), volume: last ? 0.55 : 0.4 }));
});

// 15x15 is where the field falls off. Each version's best 15x15 score, drawn as a
// row of ten puzzle cells, until v1.2 fills the row.
export const TheWall: React.FC = () => {
	const frame = useCurrentFrame();
	const cell = 64;

	return (
		<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
			<Sfx cues={cues} />
			<div style={{ display: "flex", flexDirection: "column", gap: 34, width: 1600 }}>
				<Headline
					style={{
						opacity: interpolate(frame, [0, 14], [0, 1], clamp),
						translate: interpolate(frame, [0, 20], ["0px 24px", "0px 0px"], { ...clamp, easing: snap }),
					}}
				>
					15×15 is where models break.
				</Headline>
				<div
					style={{
						display: "flex",
						gap: 34,
						fontFamily: FONT.mono,
						fontSize: 30,
						color: C.dim,
						opacity: interpolate(frame, [16, 30], [0, 1], clamp),
					}}
				>
					<span>solve rate, all {NB.counts.models} models:</span>
					{NB.sizeCliff.map((entry) => (
						<span key={entry.size}>
							{sizeLabel(entry.size)}{" "}
							<span style={{ color: SIZE_COLORS[entry.size as keyof typeof SIZE_COLORS] }}>{Math.round(entry.accuracy)}%</span>
						</span>
					))}
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 50 }}>
					<div style={{ fontFamily: FONT.mono, fontSize: 26, color: C.dim, opacity: interpolate(frame, [34, 46], [0, 1], clamp) }}>
						best 15×15 score, by version
					</div>
					{NB.fifteenRecords.map((record, row) => {
						const { start, last, fillFrom, fillTo, cellAt } = rowTiming(row);
						const shown = Math.round(interpolate(frame, [fillFrom, fillTo], [0, record.correct], clamp));
						return (
							<div
								key={record.version}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 36,
									opacity: interpolate(frame, [start, start + 12], [0, 1], clamp),
									translate: interpolate(frame, [start, start + 18], ["0px 18px", "0px 0px"], { ...clamp, easing: snap }),
								}}
							>
								<div style={{ width: 230, flexShrink: 0, whiteSpace: "nowrap", fontFamily: FONT.mono, fontSize: 30, color: last ? C.ember : C.mutedInk }}>
									v{record.version} · {WHEN[record.version]}
								</div>
								<div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
									{Array.from({ length: record.total }, (_, i) => {
										const t = interpolate(frame, [cellAt(i, record.total), cellAt(i, record.total) + 8], [0, 1], {
											...clamp,
											easing: snap,
										});
										const solved = i < record.correct;
										return (
											<div
												key={i}
												style={{
													position: "relative",
													width: cell,
													height: cell,
													borderRadius: 13,
													background: C.emptyCell,
													boxShadow: `inset 0 0 0 1px ${C.emptyRing}`,
												}}
											>
												{solved && (
													<div
														style={{
															position: "absolute",
															inset: 0,
															borderRadius: 13,
															background: SIZE_COLORS["15x15"],
															opacity: t,
															scale: interpolate(t, [0, 1], [0.35, 1]),
														}}
													/>
												)}
											</div>
										);
									})}
								</div>
								<div style={{ width: 150, flexShrink: 0, fontFamily: FONT.mono, fontSize: 44, color: last && shown === record.total ? C.starlight : C.mutedInk }}>
									{shown}/{record.total}
								</div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 16,
										fontFamily: FONT.sans,
										fontSize: 32,
										color: C.starlight,
										whiteSpace: "nowrap",
										opacity: interpolate(frame, [fillTo, fillTo + 12], [0, 1], clamp),
									}}
								>
									<ProviderLogo provider={record.provider} size={32} style={{ color: PROVIDER_COLORS[record.provider] }} />
									{record.name}
									<EffortPill>{record.effort}</EffortPill>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};
