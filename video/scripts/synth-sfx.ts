// Synthesizes the video's small sounds into public/sfx/: tuned plucks for cells
// filling in, ticks for crosses, and the chord hits. All plucks sit on the D
// major pentatonic so they stay in key with the music (see compose-music.ts).
//
//   bun run synth-sfx

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const RATE = 48000;
const OUT = join(import.meta.dir, "../public/sfx");

const PENTATONIC = [0, 2, 4, 7, 9];
const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];

export const noteName = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Deterministic noise so re-running the script produces identical files.
let seed = 0x9e3779b9;
function noise() {
	seed ^= seed << 13;
	seed ^= seed >>> 17;
	seed ^= seed << 5;
	return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

function buffer(seconds: number) {
	return new Float32Array(Math.round(seconds * RATE));
}

// A soft mallet pluck: a few decaying harmonics, a quick attack and a breath of
// noise on the onset. Somewhere between a kalimba and a muted marimba.
function pluck(out: Float32Array, midi: number, gain = 1, decay = 0.32, offset = 0) {
	const f = freq(midi);
	const partials = [
		[1, 1, 1],
		[2, 0.28, 0.55],
		[3, 0.08, 0.35],
		[4.02, 0.04, 0.2],
	];
	const start = Math.round(offset * RATE);
	for (let i = start; i < out.length; i++) {
		const t = (i - start) / RATE;
		const attack = Math.min(1, t / 0.004);
		let sample = 0;
		for (const [ratio, amp, life] of partials) {
			sample += amp * Math.sin(2 * Math.PI * f * ratio * t) * Math.exp(-t / (decay * life));
		}
		sample += noise() * 0.04 * Math.exp(-t / 0.006);
		out[i] += sample * attack * gain;
	}
}

function tick(out: Float32Array, hz: number, gain = 1) {
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		out[i] += gain * (Math.sin(2 * Math.PI * hz * t) * Math.exp(-t / 0.012) + noise() * 0.25 * Math.exp(-t / 0.003));
	}
}

function sub(out: Float32Array, midi: number, gain: number, decay: number) {
	const f = freq(midi);
	for (let i = 0; i < out.length; i++) {
		const t = i / RATE;
		out[i] += gain * Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.01) * Math.exp(-t / decay);
	}
}

function normalize(out: Float32Array, peakDb = -3) {
	let peak = 0;
	for (const sample of out) peak = Math.max(peak, Math.abs(sample));
	const target = 10 ** (peakDb / 20);
	if (peak > 0) for (let i = 0; i < out.length; i++) out[i] *= target / peak;
	// 5 ms fade-out so nothing clicks at the tail.
	const fade = Math.round(0.005 * RATE);
	for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
	return out;
}

function wav(samples: Float32Array) {
	const data = Buffer.alloc(samples.length * 2);
	samples.forEach((sample, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2));
	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVEfmt ", 8);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(RATE, 24);
	header.writeUInt32LE(RATE * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write("data", 36);
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data]);
}

async function save(name: string, samples: Float32Array) {
	await writeFile(join(OUT, `${name}.wav`), wav(normalize(samples)));
}

if (import.meta.main) {
	await mkdir(OUT, { recursive: true });

	// D3 to D7 on the pentatonic: plenty of room for rising runs.
	const notes: string[] = [];
	for (let octave = 3; octave <= 6; octave++) {
		for (const step of PENTATONIC) {
			const midi = 12 * (octave + 1) + 2 + step;
			const out = buffer(1.2);
			pluck(out, midi);
			await save(`pluck-${noteName(midi)}`, out);
			notes.push(noteName(midi));
		}
	}

	const cross = buffer(0.08);
	tick(cross, 1400, 1);
	await save("cross", cross);

	const tickHigh = buffer(0.08);
	tick(tickHigh, 2600, 1);
	await save("tick", tickHigh);

	// The 30/30 hit: a D major voicing struck together over a soft sub.
	const hit = buffer(3.2);
	for (const [midi, gain] of [[50, 0.7], [57, 0.6], [62, 0.8], [66, 0.6], [69, 0.55], [74, 0.45], [78, 0.3]] as const) {
		pluck(hit, midi, gain, 0.9);
	}
	sub(hit, 38, 0.9, 0.9);
	await save("hit", hit);

	// The outro's settle: the same chord, rolled upwards and left to ring.
	const resolve = buffer(4);
	[50, 57, 62, 66, 69, 76].forEach((midi, i) => pluck(resolve, midi, 0.6, 1.2, i * 0.06));
	sub(resolve, 38, 0.5, 1.4);
	await save("resolve", resolve);

	console.log(`public/sfx: ${notes.length} plucks (${notes[0]} to ${notes.at(-1)}), cross, tick, hit, resolve`);
}
