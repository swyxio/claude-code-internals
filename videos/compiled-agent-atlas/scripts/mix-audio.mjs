import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const narration = resolve("assets/audio/narration.wav");
const score = resolve("assets/audio/engine-surface-boundary-score.wav");
const output = resolve("assets/audio/final-mix.wav");
execFileSync("ffmpeg", [
  "-y", "-i", narration, "-i", score,
  "-filter_complex",
  "[1:a][0:a]sidechaincompress=threshold=0.018:ratio=7:attack=15:release=380[ducked];[0:a][ducked]amix=inputs=2:weights='1 0.85':normalize=0,loudnorm=I=-14:TP=-2:LRA=9,alimiter=limit=0.82:level=0:attack=5:release=50,aresample=44100,aformat=channel_layouts=stereo[mix]",
  "-map", "[mix]", "-t", "300", "-c:a", "pcm_s16le", output,
], { stdio: "inherit" });
console.log(`✓ mix: ${output}`);
