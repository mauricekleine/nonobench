import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile } from "remotion";

import { Background, Grain } from "./brand/Background";
import { HardMode } from "./scenes/HardMode";
import { Intro } from "./scenes/Intro";
import { Leaderboard } from "./scenes/Leaderboard";
import { Outro } from "./scenes/Outro";
import { PerfectRun } from "./scenes/PerfectRun";
import { ThePuzzle } from "./scenes/ThePuzzle";
import { TheWall } from "./scenes/TheWall";
import { WhatsNew } from "./scenes/WhatsNew";
import { SCENES, TOTAL_FRAMES, TRANSITION } from "./timing";

const cut = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />;

// Nonobench v1.2 announcement. The room (background, grain) stays put while the
// scenes cross-fade on top of it.
export const NonobenchV12: React.FC = () => (
	<AbsoluteFill>
		<Background />
		{/* The soundtrack is composed to this timeline (scripts/compose-music.ts); the
		    scenes carry their own sound effects. It fades across the outro so the
		    closing chord carries the ending. */}
		<Audio
			name="Soundtrack"
			src={staticFile("music/soundtrack.mp3")}
			volume={(f) => interpolate(f, [0, 12, TOTAL_FRAMES - SCENES.outro, TOTAL_FRAMES], [0, 0.75, 0.75, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
		/>
		<TransitionSeries>
			<TransitionSeries.Sequence name="Intro" durationInFrames={SCENES.intro}>
				<Intro />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="The puzzle" durationInFrames={SCENES.puzzle}>
				<ThePuzzle />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="The 15x15 wall" durationInFrames={SCENES.wall}>
				<TheWall />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="Perfect run" durationInFrames={SCENES.perfect}>
				<PerfectRun />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="Leaderboard" durationInFrames={SCENES.leaderboard}>
				<Leaderboard />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="Hard mode" durationInFrames={SCENES.hard}>
				<HardMode />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="New in v1.2" durationInFrames={SCENES.whatsNew}>
				<WhatsNew />
			</TransitionSeries.Sequence>
			{cut}
			<TransitionSeries.Sequence name="Outro" durationInFrames={SCENES.outro}>
				<Outro />
			</TransitionSeries.Sequence>
		</TransitionSeries>
		<Grain />
	</AbsoluteFill>
);
