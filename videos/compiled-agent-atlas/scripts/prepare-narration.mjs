import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const project = resolve(".");
const script = readFileSync(resolve(project, "SCRIPT.md"), "utf8");
const kokoroPython = "/tmp/hf-kokoro-venv/bin/python";
const voice = "am_michael";
const cacheDir = process.env.CLAUDE_ATLAS_CACHE_DIR
  ? resolve(process.env.CLAUDE_ATLAS_CACHE_DIR)
  : join(tmpdir(), "claude-code-internals-atlas");
const narrationDir = join(cacheDir, "narration");
mkdirSync(narrationDir, { recursive: true });

const lines = [...script.matchAll(/## Line (\d+) — .*?\n\n\*\*Time:\*\* ([\d.]+) – ([\d.]+)s.*?\n\n    (.+?)(?=\n\n## Line|\n*$)/gs)].map((match) => ({
  id: Number(match[1]),
  start: Number(match[2]),
  end: Number(match[3]),
  text: match[4].trim(),
}));
if (lines.length !== 14) throw new Error(`Expected 14 narration lines, found ${lines.length}`);

const probeDuration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" }).trim());
for (const line of lines) {
  const pad = String(line.id).padStart(2, "0");
  const output = resolve(narrationDir, `line-${pad}.wav`);
  execFileSync("npx", ["--yes", "hyperframes@0.7.43", "tts", line.text, "--output", output, "--voice", voice], {
    stdio: "inherit",
    env: { ...process.env, HYPERFRAMES_PYTHON: kokoroPython },
  });
  const duration = probeDuration(output);
  if (duration > line.end - line.start - 0.35) throw new Error(`Line ${pad} is ${duration.toFixed(2)}s but has only ${(line.end - line.start).toFixed(2)}s`);
  line.path = `cache/narration/line-${pad}.wav`;
  line.cachePath = output;
  line.duration = duration;
}

const args = ["-y", "-f", "lavfi", "-t", "300", "-i", "anullsrc=r=44100:cl=stereo"];
for (const line of lines) args.push("-i", line.cachePath);
const filters = lines.map((line, index) => `[${index + 1}:a]adelay=${Math.round(line.start * 1000)}|${Math.round(line.start * 1000)}[voice${index}]`);
filters.push(`[0:a]${lines.map((_, index) => `[voice${index}]`).join("")}amix=inputs=${lines.length + 1}:duration=longest:normalize=0,atrim=duration=300,asetpts=N/SR/TB[narration]`);
const narration = join(cacheDir, "narration.wav");
args.push("-filter_complex", filters.join(";"), "-map", "[narration]", "-c:a", "pcm_s16le", narration);
execFileSync("ffmpeg", args, { stdio: "inherit" });
for (const line of lines) delete line.cachePath;
writeFileSync(resolve(project, "audio/narration-manifest.json"), JSON.stringify(lines, null, 2));
console.log(`✓ narration: ${narration}`);
