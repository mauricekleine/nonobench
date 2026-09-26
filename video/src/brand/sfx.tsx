import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

// The plucks scripts/synth-sfx.ts renders: D major pentatonic from D3 upwards.
// Degree 0 is D3, 5 is D4, 10 is D5, 15 is D6.
const PLUCK_NAMES = [3, 4, 5, 6].flatMap((octave) => ["D", "E", "Fs", "A", "B"].map((note) => `${note}${octave}`));

export type Cue = { at: number; sound: string; volume?: number };

export const pluck = (degree: number) => `pluck-${PLUCK_NAMES[Math.max(0, Math.min(PLUCK_NAMES.length - 1, Math.round(degree)))]}`;

/** Plays each cue at its local frame. Cues come from the same numbers that drive the picture. */
// Sound effects sit under the soundtrack: one trim for the whole layer.
const LAYER_GAIN = 0.55;

export const Sfx: React.FC<{ cues: Cue[]; gain?: number }> = ({ cues, gain = LAYER_GAIN }) => (
	<>
		{cues.map((cue, i) => (
			<Audio
				key={`${cue.sound}-${i}`}
				name={cue.sound}
				from={Math.max(0, Math.round(cue.at))}
				src={staticFile(`sfx/${cue.sound.includes(".") ? cue.sound : `${cue.sound}.wav`}`)}
				volume={() => Math.min(1, (cue.volume ?? 1) * gain)}
			/>
		))}
	</>
);
