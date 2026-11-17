// UP SFX pack: code-made sound effects, tuned to A minor (matches the afroglow bed).
// Usage: node brand-music/make-sfx.mjs [outDir]   (default brand-music/sfx)
// Writes WAV, plus MP3 when FFmpeg is found (C:/hfout/bin/ffmpeg.exe or PATH).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(HERE, "sfx");
const SR = 48000;
const TAU = Math.PI * 2;

// seeded rng so every run is identical
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function buf(secs) { return new Float32Array(Math.ceil(secs * SR)); }
// exponential-decay envelope with linear attack
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// phase-accumulating oscillator over a frequency function
function osc(out, start, dur, freqFn, ampFn, shape = "sin") {
  let ph = 0;
  const s0 = Math.floor(start * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    ph += freqFn(t) / SR;
    const p = ph % 1;
    let v;
    if (shape === "sin") v = Math.sin(TAU * p);
    else if (shape === "sq") v = p < 0.5 ? 1 : -1;
    else if (shape === "saw") v = 2 * p - 1;
    else v = 1 - 4 * Math.abs(p - 0.5); // tri
    out[s0 + i] += v * ampFn(t);
  }
}

// biquad filter (RBJ), in place
function biquad(x, type, f, q = 0.707) {
  const w = (TAU * f) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; } // bp
  a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}

// time-varying filter on noise: freqFn(t) per block
function sweptNoise(out, start, dur, type, freqFn, ampFn, q = 1.5) {
  const n = Math.floor(dur * SR), s0 = Math.floor(start * SR), B = 64;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let b = 0; b < n; b += B) {
    const f = Math.min(freqFn(b / SR), SR * 0.45), w = (TAU * f) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    for (let i = b; i < Math.min(b + B, n) && s0 + i < out.length; i++) {
      const xi = noise();
      const y = (b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = xi; y2 = y1; y1 = y;
      out[s0 + i] += y * ampFn(i / SR);
    }
  }
}

// small room: a few feedback combs, mixed in
function room(x, mix = 0.2, size = 1) {
  const taps = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => Math.floor(d * size * SR));
  const wet = new Float32Array(x.length);
  for (const d of taps) {
    const line = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) { line[i] = x[i] + (i >= d ? line[i - d] * 0.72 : 0); wet[i] += line[i] * 0.25; }
  }
  biquad(wet, "lp", 5000);
  for (let i = 0; i < x.length; i++) x[i] = x[i] * (1 - mix) + wet[i] * mix;
  return x;
}

// bell / mallet: partials with their own decays
function bell(out, start, f, amp, dec, partials) {
  for (const [r, a, dk] of partials) osc(out, start, dec * dk * 6, () => f * r, (t) => amp * a * env(t, 0.002, dec * dk));
}
const MARIMBA = [[1, 1, 1], [3.93, 0.35, 0.25], [9.2, 0.12, 0.1]];
const GLASS = [[1, 1, 1], [2.76, 0.6, 0.6], [5.4, 0.35, 0.35], [8.93, 0.2, 0.2]];
const CHIME = [[1, 1, 1], [2, 0.3, 0.7], [3.01, 0.15, 0.4]];

function norm(x, peak = 0.89) {
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  // 4 ms fade-out so nothing clicks at the end
  const f = Math.floor(0.004 * SR); for (let i = 0; i < f; i++) x[x.length - 1 - i] *= i / f;
  return x;
}

// ---------------------------------------------------------------- the pack
const S = {};

// portal ring pops open: rising sine bloop
S["bloop"] = () => { const x = buf(0.4);
  osc(x, 0, 0.35, (t) => 180 + 900 * (1 - Math.exp(-t * 18)), (t) => env(t, 0.004, 0.09));
  osc(x, 0, 0.2, (t) => 2 * (180 + 900 * (1 - Math.exp(-t * 18))), (t) => 0.25 * env(t, 0.002, 0.04));
  return room(x, 0.15); };

// orange tunnel: laser zap down
S["zap"] = () => { const x = buf(0.6);
  osc(x, 0, 0.5, (t) => 2600 * Math.exp(-t * 9) + 110, (t) => 0.6 * env(t, 0.003, 0.14), "saw");
  osc(x, 0, 0.5, (t) => 2610 * Math.exp(-t * 9) + 112, (t) => 0.6 * env(t, 0.003, 0.14), "saw");
  biquad(x, "lp", 4200); return room(x, 0.25); };

// lime tunnel: springy boing
S["boing"] = () => { const x = buf(0.8);
  osc(x, 0, 0.75, (t) => (190 + 260 * (1 - Math.exp(-t * 5))) * (1 + 0.35 * Math.exp(-t * 5) * Math.sin(TAU * 13 * t)), (t) => env(t, 0.004, 0.22));
  osc(x, 0, 0.3, () => 95, (t) => 0.4 * env(t, 0.002, 0.05));
  return room(x, 0.15); };

// reverse cymbal swell (lead-in for the finale dive)
S["rev-swell"] = () => { const x = buf(1.2);
  sweptNoise(x, 0, 1.15, "bp", (t) => 1500 + 9000 * (t / 1.15) ** 2, (t) => Math.pow(t / 1.15, 3), 0.9);
  sweptNoise(x, 0, 1.15, "hp", () => 6000, (t) => 0.6 * Math.pow(t / 1.15, 4), 0.7);
  return x; };

// flash into slide 1: tight clap/snap
S["snap"] = () => { const x = buf(0.5);
  [0, 0.011, 0.023].forEach((o, k) => sweptNoise(x, o, 0.25, "bp", () => 1400, (t) => (k === 2 ? 1 : 0.6) * env(t, 0.0008, k === 2 ? 0.05 : 0.008), 1.2));
  osc(x, 0.023, 0.08, (t) => 220 - 900 * t, (t) => 0.5 * env(t, 0.001, 0.02));
  return room(x, 0.3, 0.8); };

// flash into slide 2: glass hit
S["glass"] = () => { const x = buf(1.4);
  bell(x, 0, 1320, 0.7, 0.32, GLASS);
  sweptNoise(x, 0, 0.05, "hp", () => 5000, (t) => 0.5 * env(t, 0.0005, 0.01), 0.8);
  return room(x, 0.3, 1.3); };

// flash into slide 3: pitched tom pop
S["tom"] = () => { const x = buf(0.6);
  osc(x, 0, 0.5, (t) => 90 + 140 * Math.exp(-t * 22), (t) => env(t, 0.001, 0.14));
  sweptNoise(x, 0, 0.03, "bp", () => 3000, (t) => 0.4 * env(t, 0.0005, 0.006), 1);
  return room(x, 0.2); };

// save tap 1: two-note coin
S["coin"] = () => { const x = buf(0.6);
  osc(x, 0, 0.08, () => midi(83), (t) => 0.4 * env(t, 0.001, 0.2), "sq");
  osc(x, 0.075, 0.5, () => midi(88), (t) => 0.4 * env(t, 0.001, 0.13), "sq");
  biquad(x, "lp", 6000); return room(x, 0.15); };

// save tap 3: water bubble pluck
S["bubble"] = () => { const x = buf(0.3);
  osc(x, 0, 0.12, (t) => 380 + 1500 * (t / 0.12) ** 0.6, (t) => env(t, 0.002, 0.035));
  osc(x, 0.07, 0.1, (t) => 600 + 1700 * (t / 0.1) ** 0.6, (t) => 0.5 * env(t, 0.002, 0.03));
  return room(x, 0.2); };

// Apply → ✓ Tracking: rising fifth ba-ding
S["success"] = () => { const x = buf(1.2);
  bell(x, 0, midi(81), 0.5, 0.18, CHIME);
  bell(x, 0.11, midi(88), 0.6, 0.35, CHIME);
  return room(x, 0.25, 1.2); };

// "5 per story" count: marimba up A minor pentatonic
[57 + 12, 60 + 12, 62 + 12, 64 + 12, 67 + 12, 69 + 12].forEach((m, i) => {
  S[`marimba-${i + 1}`] = () => { const x = buf(0.9); bell(x, 0, midi(m), 0.8, 0.16, MARIMBA);
    osc(x, 0, 0.01, () => midi(m) * 6, (t) => 0.2 * env(t, 0.0005, 0.002)); return room(x, 0.2); };
});

// "that's it.": rubber stamp thunk
S["stamp"] = () => { const x = buf(0.5);
  osc(x, 0, 0.3, (t) => 70 + 80 * Math.exp(-t * 40), (t) => env(t, 0.001, 0.06));
  sweptNoise(x, 0, 0.12, "lp", () => 1800, (t) => 0.7 * env(t, 0.0005, 0.018), 0.8);
  return room(x, 0.15, 0.6); };

// "no endless scroll.": slide whistle down
S["slide-down"] = () => { const x = buf(0.7);
  osc(x, 0, 0.6, (t) => (1300 * Math.exp(-t * 2.8) + 250) * (1 + 0.02 * Math.sin(TAU * 7 * t)), (t) => 0.7 * Math.min(1, t / 0.03) * (t > 0.5 ? (0.6 - t) / 0.1 : 1));
  osc(x, 0, 0.6, (t) => 2 * (1300 * Math.exp(-t * 2.8) + 250), (t) => 0.06 * Math.min(1, t / 0.03) * (t > 0.5 ? (0.6 - t) / 0.1 : 1));
  return room(x, 0.15); };

// Save all tap: zip up
S["zip"] = () => { const x = buf(0.35);
  osc(x, 0, 0.22, (t) => 300 * Math.pow(9, t / 0.22), (t) => 0.5 * Math.min(1, t / 0.01) * (1 - t / 0.22), "tri");
  sweptNoise(x, 0, 0.22, "bp", (t) => 1500 * Math.pow(5, t / 0.22), (t) => 0.5 * (1 - t / 0.22), 2);
  return room(x, 0.15); };

// toast lands: A minor triad pling
S["pling"] = () => { const x = buf(1.2);
  [81, 84, 88].forEach((m, i) => bell(x, i * 0.06, midi(m), 0.45, 0.28, CHIME));
  return room(x, 0.3, 1.2); };

// mascot hero lands: confetti burst
S["confetti"] = () => { const x = buf(1.0);
  sweptNoise(x, 0, 0.3, "hp", () => 2500, (t) => 0.5 * env(t, 0.001, 0.06), 0.7);
  osc(x, 0, 0.12, (t) => 160 - 400 * t, (t) => 0.5 * env(t, 0.001, 0.04));
  for (let k = 0; k < 18; k++) { const t0 = 0.02 + rnd() * 0.55, m = 84 + Math.floor(rnd() * 16);
    osc(x, t0, 0.12, () => midi(m), (t) => 0.12 * env(t, 0.001, 0.03)); }
  return room(x, 0.3, 1.1); };

// logo end: soft shimmer chord
S["shimmer"] = () => { const x = buf(2.4);
  [69, 76, 81, 84, 88].forEach((m, i) => osc(x, i * 0.03, 2.3, (t) => midi(m) * (1 + 0.002 * Math.sin(TAU * 5 * t)), (t) => 0.18 * Math.min(1, t / 0.02) * Math.exp(-t / 0.8) * (0.75 + 0.25 * Math.sin(TAU * 6 * t))));
  sweptNoise(x, 0, 1.2, "hp", () => 8000, (t) => 0.06 * Math.exp(-t / 0.3), 0.7);
  return room(x, 0.35, 1.4); };

// softer sub thump (a lighter boom alternative)
S["thump"] = () => { const x = buf(0.6);
  osc(x, 0, 0.55, (t) => 48 + 70 * Math.exp(-t * 28), (t) => env(t, 0.002, 0.16));
  return x; };

// ---------------------------------------------------------------- write
function wav(file, x) {
  const N = x.length, b = Buffer.alloc(44 + N * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + N * 4, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { const v = Math.round(Math.max(-1, Math.min(1, x[i])) * 32767); b.writeInt16LE(v, 44 + i * 4); b.writeInt16LE(v, 46 + i * 4); }
  fs.writeFileSync(file, b);
}
function ffmpeg() {
  for (const p of [process.env.FFMPEG, "C:/hfout/bin/ffmpeg.exe", "ffmpeg"]) {
    if (!p) continue; try { execFileSync(p, ["-version"], { stdio: "ignore" }); return p; } catch {}
  }
  return null;
}

fs.mkdirSync(OUT, { recursive: true });
const ff = ffmpeg();
for (const [name, make] of Object.entries(S)) {
  const w = path.join(OUT, name + ".wav");
  wav(w, norm(make()));
  if (ff) { execFileSync(ff, ["-y", "-loglevel", "error", "-i", w, "-b:a", "192k", path.join(OUT, name + ".mp3")]); fs.unlinkSync(w); }
}
console.log(`${Object.keys(S).length} sfx → ${OUT}${ff ? " (mp3)" : " (wav)"}`);
