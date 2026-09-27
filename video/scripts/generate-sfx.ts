// Generates the two textured sounds a synth can't fake well, the riser into
// Hard mode and the impact on "so we built 20×20", with ElevenLabs Sound
// Effects. Costs a few credits; the files are committed, so run it only to
// replace them.
//
//   ELEVENLABS_API_KEY=... bun run generate-sfx [riser|impact]

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOUNDS = {
	riser: {
		text: "Short cinematic riser, soft filtered white noise and a shimmering synth swelling upwards, clean, modern, restrained, ends abruptly at its peak",
		duration_seconds: 2,
	},
	impact: {
		text: "Deep soft cinematic impact, warm sub boom with a gentle airy tail, modern tech product reveal, no metal, no glass",
		duration_seconds: 2.5,
	},
} as const;

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY");

const only = process.argv[2];
for (const [name, body] of Object.entries(SOUNDS)) {
	if (only && only !== name) continue;
	const response = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192", {
		method: "POST",
		headers: { "xi-api-key": key, "Content-Type": "application/json" },
		body: JSON.stringify({ ...body, prompt_influence: 0.5 }),
	});
	if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`);
	const out = join(import.meta.dir, `../public/sfx/${name}.mp3`);
	await writeFile(out, Buffer.from(await response.arrayBuffer()));
	console.log(`${name} → public/sfx/${name}.mp3`);
}
