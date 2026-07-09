# Inside a Compiled Agent — video source

This is a five-minute, three-act HyperFrames composition: **Engine**, **Surface**, and **Boundary**.

## Rebuild

```sh
node scripts/generate-score.mjs
node scripts/prepare-narration.mjs
node scripts/mix-audio.mjs
npm run check
npx hyperframes render --quality high --fps 30 --strict-all --output renders/inside-a-compiled-agent.mp4
```

The composition plays the committed `assets/audio/final-mix.m4a`; the original MIDI is next to it. Large, lossless score and narration intermediates are regenerated in `$TMPDIR/claude-code-internals-atlas` (or `CLAUDE_ATLAS_CACHE_DIR`) so the repository remains safe for the wiki's publication validator.
