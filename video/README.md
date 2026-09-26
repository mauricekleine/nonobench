# Nonobench videos

Remotion project for Nonobench announcement videos. The first one is the v1.2
announcement (`NonobenchV12`, 1920×1080, 30 fps, 68s).

```bash
bun install
bun run dev                                   # Remotion Studio
bun run render NonobenchV12 out/nonobench-v1.2.mp4
bun run master out/nonobench-v1.2.mp4          # → out/nonobench-v1.2.master.mp4, -14 LUFS / -1 dBTP
```

Share the `.master.mp4`.

## Data

Every number, model name and puzzle in the video comes from
`src/data/nonobench.json`, which `scripts/sync-data.ts` pulls from a running
Nonobench site's public API. Re-sync once new runs land, then re-render:

```bash
bun run sync-data                                        # production (www.nonobench.com)
bun run sync-data -- --from http://localhost:3850        # a local dev site
```

## Sound

The timeline runs on a 120 BPM bar grid (`src/timing.ts`): every scene starts on
a downbeat, and the 30/30 moment and "so we built 20×20" land on bar lines.

- **Soundtrack:** `bun run compose-music <label>` sends ElevenLabs Music
  (`music_v2`) a composition plan built from the grid, one section per scene,
  and saves `public/music/candidate-<label>.mp3` plus its song id. Copy the one
  you like to `public/music/soundtrack.mp3`. `--plan` prints the plan for free.
  Change BPM or a scene's bars and the plan follows; regenerate the music after.
  `--redo <candidate> <Section>` regenerates one section and keeps the rest.
  Cost on 2026-09-26: about 850 credits per 68 s track, and about 1,700 for a
  one-section redo (it bills like more than a full track).
  `soundtrack.mp3` is currently `candidate-c-drop`.
- **Sound effects:** each scene plays cues from the same frame numbers that drive
  its animation (`src/brand/sfx.tsx`). `bun run synth-sfx` renders the plucks,
  ticks and chord hits in D major pentatonic; `bun run generate-sfx` makes the
  riser and impact with ElevenLabs Sound Effects.

The ElevenLabs scripts read `ELEVENLABS_API_KEY`; both cost credits.

## Layout

- `src/brand/`: the site's look, ported. `theme.ts` holds the tokens from
  `visualizer/app/globals.css` (night ground, starlight text, ember accent,
  grid-size colours, provider colours) and the three fonts (Unbounded, Figtree,
  Fragment Mono). `Nonogram.tsx` draws and solves any puzzle; `Background.tsx`
  is the nonogram-paper room with its ember glow and film grain.
- `src/scenes/`: one file per scene. Each is also registered on its own under
  `NonobenchV12-Scenes` in Studio.
- `src/NonobenchV12.tsx`: scene order and lengths (`SCENES`), cross-fades.

Provider logos are MIT licensed paths from LobeHub, see
`src/brand/PROVIDER-LOGOS-LICENSE.md`.
