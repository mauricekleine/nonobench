import type { CSSProperties, ReactNode } from "react";

import { C, FONT } from "./theme";

// The effort badge next to a model name on the leaderboard: mono, hairline border.
export const EffortPill: React.FC<{ children: ReactNode; size?: number }> = ({ children, size = 22 }) => (
	<span
		style={{
			fontFamily: FONT.mono,
			fontSize: size,
			lineHeight: 1,
			color: C.mutedInk,
			padding: `${size * 0.28}px ${size * 0.45}px`,
			borderRadius: size * 0.3,
			boxShadow: `inset 0 0 0 1.5px ${C.lineStrong}`,
		}}
	>
		{children}
	</span>
);

// The "v1.2" badge beside the wordmark: ember hairline, ember mono.
export const VersionPill: React.FC<{ children: ReactNode; size?: number; style?: CSSProperties }> = ({ children, size = 30, style }) => (
	<span
		style={{
			fontFamily: FONT.mono,
			fontSize: size,
			lineHeight: 1,
			color: C.ember,
			padding: `${size * 0.3}px ${size * 0.6}px`,
			borderRadius: 999,
			boxShadow: `inset 0 0 0 2px oklch(75% 0.13 55 / 0.45)`,
			background: "oklch(75% 0.13 55 / 0.06)",
			...style,
		}}
	>
		{children}
	</span>
);

// A size-coloured tag like "hard mode" or "15×15".
export const Tag: React.FC<{ children: ReactNode; color: string; size?: number }> = ({ children, color, size = 28 }) => (
	<span
		style={{
			display: "inline-flex",
			alignItems: "center",
			gap: size * 0.45,
			fontFamily: FONT.mono,
			fontSize: size,
			lineHeight: 1,
			color,
			padding: `${size * 0.35}px ${size * 0.6}px`,
			borderRadius: 999,
			boxShadow: `inset 0 0 0 2px color-mix(in oklch, ${color} 45%, transparent)`,
			background: `color-mix(in oklch, ${color} 8%, transparent)`,
		}}
	>
		<span style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.1, background: color }} />
		{children}
	</span>
);

export const Wordmark: React.FC<{ size: number; style?: CSSProperties }> = ({ size, style }) => (
	<span
		style={{
			fontFamily: FONT.display,
			fontWeight: 600,
			fontSize: size,
			lineHeight: 1,
			letterSpacing: "-0.02em",
			color: C.starlight,
			whiteSpace: "nowrap",
			...style,
		}}
	>
		nonobench
	</span>
);

export const Headline: React.FC<{ children: ReactNode; size?: number; style?: CSSProperties }> = ({ children, size = 88, style }) => (
	<div
		style={{
			fontFamily: FONT.display,
			fontWeight: 500,
			fontSize: size,
			lineHeight: 1.08,
			letterSpacing: "-0.02em",
			color: C.starlight,
			...style,
		}}
	>
		{children}
	</div>
);
