import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const OUT_DIR = resolve("assets/audio");
const CACHE_DIR = process.env.CLAUDE_ATLAS_CACHE_DIR
  ? resolve(process.env.CLAUDE_ATLAS_CACHE_DIR)
  : join(tmpdir(), "claude-code-internals-atlas");
const WAV = join(CACHE_DIR, "engine-surface-boundary-score.wav");
const MIDI = resolve(OUT_DIR, "engine-surface-boundary-score.mid");
const sampleRate = 44_100;
const duration = 300;
const bpm = 145;
const beatSeconds = 60 / bpm;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

const midiFrequency = (note) => 440 * 2 ** ((note - 69) / 12);
const saw = (phase) => 2 * ((phase / (2 * Math.PI)) % 1) - 1;
const envelope = (position, attack, release) => {
  if (position < 0 || position > 1) return 0;
  if (position < attack) return position / attack;
  if (position > 1 - release) return (1 - position) / release;
  return 1;
};
const deterministicNoise = (index) => Math.sin(index * 12.9898 + 78.233) * 43758.5453 % 1;
const actEnergy = (t) => {
  if (t < 25) return 0.32;
  if (t < 100) return 0.72;
  if (t < 175) return 0.62;
  if (t < 260) return 0.72;
  return 0.82;
};

function writeWav() {
  const frames = sampleRate * duration;
  const bytes = Buffer.allocUnsafe(44 + frames * 4);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + frames * 4, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 4, 40);

  const bassNotes = [38, 39, 33, 36]; // D, Eb, A, C
  const leadNotes = [62, 63, 69, 72, 74, 72, 69, 63];
  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate;
    const beat = t / beatSeconds;
    const beatIndex = Math.floor(beat);
    const beatPhase = beat - beatIndex;
    const sixteenthIndex = Math.floor(beat * 4);
    const sixteenthPhase = beat * 4 - sixteenthIndex;
    const energy = actEnergy(t);
    const barBeat = beatIndex % 4;
    const bassNote = bassNotes[Math.floor(beat * 2) % bassNotes.length];
    const leadNote = leadNotes[sixteenthIndex % leadNotes.length];
    const bass = saw(2 * Math.PI * midiFrequency(bassNote) * t) * 0.075 * envelope((beat * 2) % 1, 0.02, 0.2);
    const leadGate = envelope(sixteenthPhase, 0.08, 0.42);
    const lead = (Math.sin(2 * Math.PI * midiFrequency(leadNote) * t) + 0.35 * saw(2 * Math.PI * midiFrequency(leadNote) * t)) * 0.026 * leadGate;
    const pad = Math.sin(2 * Math.PI * midiFrequency(50) * t) * 0.018 + Math.sin(2 * Math.PI * midiFrequency(57) * t) * 0.012;
    const kickPhase = beatPhase / 0.16;
    const kick = beatPhase < 0.16 ? Math.sin(2 * Math.PI * (130 - 85 * kickPhase) * t) * (1 - kickPhase) * 0.15 : 0;
    const snare = (barBeat === 1 || barBeat === 3) && beatPhase < 0.12
      ? (deterministicNoise(i) * 2 - 1) * (1 - beatPhase / 0.12) * 0.05
      : 0;
    const clock = sixteenthPhase < 0.045 ? Math.sin(2 * Math.PI * 4200 * t) * 0.012 : 0;
    const stinger = [25, 100, 175, 260].some((point) => t >= point && t < point + 0.55)
      ? Math.sin(2 * Math.PI * (220 + (t % 0.55) * 900) * t) * 0.035 * (1 - ((t % 0.55) / 0.55))
      : 0;
    const fade = Math.min(1, t / 1.2, (duration - t) / 1.8);
    const mono = Math.max(-0.92, Math.min(0.92, (bass + lead + pad + kick + snare + clock + stinger) * energy * fade));
    const stereoSpread = 0.012 * Math.sin(2 * Math.PI * 0.11 * t);
    const offset = 44 + i * 4;
    bytes.writeInt16LE(Math.round((mono - stereoSpread) * 32767), offset);
    bytes.writeInt16LE(Math.round((mono + stereoSpread) * 32767), offset + 2);
  }
  writeFileSync(WAV, bytes);
}

const vlq = (value) => {
  const bytes = [value & 0x7f];
  for (let v = value >> 7; v; v >>= 7) bytes.unshift((v & 0x7f) | 0x80);
  return bytes;
};
const event = (tick, data) => ({ tick, data });

function writeMidi() {
  const ppq = 480;
  const events = [
    event(0, [0xff, 0x51, 0x03, 0x06, 0x50, 0xc4]),
    event(0, [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]),
    event(0, [0xc0, 0x26]),
    event(0, [0xc1, 0x51]),
  ];
  const totalBeats = Math.ceil(duration / beatSeconds);
  const bassNotes = [38, 39, 33, 36];
  const leadNotes = [62, 63, 69, 72, 74, 72, 69, 63];
  for (let beat = 0; beat < totalBeats; beat += 1) {
    const tick = beat * ppq;
    events.push(event(tick, [0x99, 36, 92]));
    events.push(event(tick + 72, [0x89, 36, 0]));
    if (beat % 4 === 1 || beat % 4 === 3) {
      events.push(event(tick, [0x99, 38, 68]));
      events.push(event(tick + 90, [0x89, 38, 0]));
    }
    for (let half = 0; half < 2; half += 1) {
      const note = bassNotes[(beat * 2 + half) % bassNotes.length];
      const start = tick + half * (ppq / 2);
      events.push(event(start, [0x90, note, 72]));
      events.push(event(start + 210, [0x80, note, 0]));
    }
    for (let sixteenth = 0; sixteenth < 4; sixteenth += 1) {
      const note = leadNotes[(beat * 4 + sixteenth) % leadNotes.length];
      const start = tick + sixteenth * (ppq / 4);
      events.push(event(start, [0x91, note, 58]));
      events.push(event(start + 80, [0x81, note, 0]));
    }
  }
  events.sort((a, b) => a.tick - b.tick || a.data[0] - b.data[0]);
  const chunks = [];
  let lastTick = 0;
  for (const item of events) {
    chunks.push(...vlq(item.tick - lastTick), ...item.data);
    lastTick = item.tick;
  }
  chunks.push(0x00, 0xff, 0x2f, 0x00);
  const track = Buffer.from(chunks);
  const header = Buffer.alloc(14);
  header.write("MThd", 0);
  header.writeUInt32BE(6, 4);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(1, 10);
  header.writeUInt16BE(ppq, 12);
  const trackHeader = Buffer.alloc(8);
  trackHeader.write("MTrk", 0);
  trackHeader.writeUInt32BE(track.length, 4);
  writeFileSync(MIDI, Buffer.concat([header, trackHeader, track]));
}

writeWav();
writeMidi();
console.log(`✓ score: ${WAV}`);
console.log(`✓ midi: ${MIDI}`);
