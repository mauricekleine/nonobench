// Composes the soundtrack with ElevenLabs Music (music_v2), one section per
// scene, straight from the bar grid in src/timing.ts. music_v2 enforces section
// lengths, so every section change lands on a scene cut. Each run costs credits
// and writes a new candidate; pick one by copying it to public/music/soundtrack.mp3.
//
//   ELEVENLABS_API_KEY=... bun run compose-music [label]
//
// --plan prints the composition plan without calling the API.
// --redo <candidate> <Section> regenerates one section of a stored candidate and
// keeps the rest of its audio (inpainting), e.g. --redo c Drop.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { BPM, FRAMES_PER_BAR, FPS, SCENE_BARS, type SceneKey } from "../src/timing";

const BAR_MS = (FRAMES_PER_BAR / FPS) * 1000;

// Sets the genre and sound for the whole track; the first section carries the
// most weight, so these ride on it.
const GLOBAL = [
	"minimal modern electronic",
	"warm analog synth arpeggios",
	"soft pulsing bass",
	"felt piano accents",
	"uplifting but restrained",
	"clean polished production",
	"instrumental",
	`${BPM} BPM`,
	"D major",
];

const NEGATIVE = ["vocals", "singing", "lyrics", "ukulele", "handclaps", "whistling", "stock corporate music", "dubstep", "orchestral trailer"];

// The story, scene by scene. The perfect run splits in two so the drop lands
// on 30/30 (bar 2 of that scene, see PerfectRun.tsx).
const SECTIONS: { scene: SceneKey; bars?: number; name: string; styles: string[]; avoid?: string[] }[] = [
	{ scene: "intro", name: "Intro", styles: ["sparse", "soft synth pad", "gentle arpeggio fading in", "no drums"] },
	{ scene: "puzzle", name: "Verse", styles: ["soft kick and pulse enter", "steady arpeggio", "curious", "light"] },
	{ scene: "wall", name: "Build", styles: ["building tension", "filter slowly opening", "rising energy", "drums build up"] },
	{ scene: "perfect", bars: 2, name: "Pre-drop", styles: ["tension peaks", "rising arpeggio", "anticipation", "snare roll"] },
	{ scene: "perfect", bars: 3, name: "Drop", styles: ["the drop", "full energy", "big warm chords", "euphoric but tasteful", "driving beat", "loudest part so far"], avoid: ["quiet", "sparse", "build-up"] },
	{ scene: "leaderboard", name: "Groove", styles: ["steady confident groove", "full beat", "arpeggio continues"] },
	{ scene: "hard", name: "Hard mode", styles: ["darker section starting with a big hit", "B minor", "heavier bass", "bigger and determined", "tension"] },
	{ scene: "whatsNew", name: "Lift", styles: ["back to D major", "warm and uplifting", "full arrangement continues", "steady driving beat", "confident"], avoid: ["silence", "breakdown", "sparse", "fade out"] },
	{ scene: "outro", name: "Outro", styles: ["elements drop out", "final chord rings out", "gentle ending"] },
];

function plan() {
	const used = new Map<SceneKey, number>();
	const chunks = SECTIONS.map((section, i) => {
		const bars = section.bars ?? SCENE_BARS[section.scene];
		used.set(section.scene, (used.get(section.scene) ?? 0) + bars);
		return {
			text: `[${section.name}]`,
			duration_ms: Math.round(bars * BAR_MS),
			positive_styles: i === 0 ? [...GLOBAL, ...section.styles] : section.styles,
			negative_styles: [...NEGATIVE, ...(section.avoid ?? [])],
			context_adherence: "high",
		};
	});
	for (const [scene, bars] of Object.entries(SCENE_BARS)) {
		if (used.get(scene as SceneKey) !== bars) throw new Error(`Sections cover ${used.get(scene as SceneKey) ?? 0} of ${scene}'s ${bars} bars`);
	}
	return { chunks };
}

// Keep every section of a stored song except `redo`, which is generated again.
async function redoPlan(candidate: string, redo: string) {
	const { songId } = JSON.parse(await Bun.file(join(import.meta.dir, `../public/music/candidate-${candidate}.json`)).text());
	if (!songId) throw new Error(`candidate-${candidate} has no song id`);
	let at = 0;
	const chunks = plan().chunks.map((chunk) => {
		const range = { start_ms: at, end_ms: at + chunk.duration_ms };
		at = range.end_ms;
		return chunk.text === `[${redo}]` ? chunk : { song_id: songId, range };
	});
	if (!chunks.some((chunk) => "text" in chunk)) throw new Error(`No section named ${redo}`);
	return { chunks };
}

const redoIndex = process.argv.indexOf("--redo");
const composition = redoIndex >= 0 ? await redoPlan(process.argv[redoIndex + 1], process.argv[redoIndex + 2]) : plan();
if (process.argv.includes("--plan")) {
	console.log(JSON.stringify(composition, null, 2));
	process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY");

const label =
	redoIndex >= 0
		? `${process.argv[redoIndex + 1]}-${process.argv[redoIndex + 2].toLowerCase()}`
		: (process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? new Date().toISOString().slice(0, 19).replace(/[:T]/g, ""));
const dir = join(import.meta.dir, "../public/music");
await mkdir(dir, { recursive: true });

const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192", {
	method: "POST",
	headers: { "xi-api-key": key, "Content-Type": "application/json" },
	body: JSON.stringify({ composition_plan: composition, model_id: "music_v2", store_for_inpainting: true }),
});
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);

await writeFile(join(dir, `candidate-${label}.mp3`), Buffer.from(await response.arrayBuffer()));
// The song id lets us regenerate one section later (inpainting) without redoing the rest.
const songId = response.headers.get("song-id");
await writeFile(join(dir, `candidate-${label}.json`), `${JSON.stringify({ songId, plan: composition }, null, "\t")}\n`);
console.log(`public/music/candidate-${label}.mp3 (song ${songId ?? "id not returned"})`);
