// The video's clock. Every scene starts on a bar line of the music, so the
// soundtrack can be composed straight from this table (scripts/compose-music.ts)
// and scene changes land on downbeats. Change BPM or a scene's bars here and
// both the picture and the music plan follow.

export const FPS = 30;
export const BPM = 120;
export const FRAMES_PER_BEAT = (FPS * 60) / BPM;
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * 4;

// Cross-fade between scenes. The next scene starts fading in on its downbeat.
export const TRANSITION = 14;

// Bars each scene owns on the timeline, in order.
export const SCENE_BARS = {
	intro: 3,
	puzzle: 3,
	wall: 5,
	perfect: 5,
	leaderboard: 3,
	hard: 6,
	whatsNew: 6,
	outro: 3,
} as const;

export type SceneKey = keyof typeof SCENE_BARS;

const keys = Object.keys(SCENE_BARS) as SceneKey[];

// Sequence lengths: every scene but the last also covers the fade into the next.
export const SCENES = Object.fromEntries(
	keys.map((key, i) => [key, SCENE_BARS[key] * FRAMES_PER_BAR + (i < keys.length - 1 ? TRANSITION : 0)]),
) as Record<SceneKey, number>;

export const TOTAL_BARS = keys.reduce((sum, key) => sum + SCENE_BARS[key], 0);
export const TOTAL_FRAMES = TOTAL_BARS * FRAMES_PER_BAR;

/** Local frame of a beat within a scene (bar and beat count from 0). */
export const beat = (bar: number, beatInBar = 0) => bar * FRAMES_PER_BAR + beatInBar * FRAMES_PER_BEAT;
