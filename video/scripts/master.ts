// Masters the rendered video's audio for social: two-pass loudnorm to -14 LUFS
// integrated, -1 dBTP true peak. The picture is copied untouched.
//
//   bun run master out/nonobench-v1.2.mp4   → out/nonobench-v1.2.master.mp4

import { $ } from "bun";

const input = process.argv[2] ?? "out/nonobench-v1.2.mp4";
const output = input.replace(/\.mp4$/, ".master.mp4");
const TARGET = "I=-14:TP=-1:LRA=11";

const analysis = await $`ffmpeg -hide_banner -i ${input} -af loudnorm=${TARGET}:print_format=json -f null -`.nothrow().quiet();
const stats = JSON.parse(analysis.stderr.toString().match(/\{[\s\S]*?\}/)?.[0] ?? "{}");
const measured = `measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}`;

await $`ffmpeg -hide_banner -loglevel error -y -i ${input} -c:v copy -af loudnorm=${TARGET}:${measured}:linear=true -ar 48000 -c:a aac -b:a 192k ${output}`;
console.log(`${output} (was ${stats.input_i} LUFS, ${stats.input_tp} dBTP)`);
