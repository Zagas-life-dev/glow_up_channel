// UP brand music library: five background beds, generated entirely in code.
//
// Every track follows the same contract so they are interchangeable in any film:
//   - any length: render(id, seconds) fills the time with whole bars
//   - the ending (a resolving final chord) lands exactly on `endAt` (default: 3s before the end),
//     so it can be lined up with a film's end card
//   - 2-bar intro, then 8-bar A/B sections that alternate (B is fuller); a fill closes every B
//   - stereo 44.1 kHz, mixed to the same loudness (RMS) and peak ceiling, so swapping tracks
//     never needs a volume change
import fs from "node:fs";

const SR = 44100;
const TAU = Math.PI * 2;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const coefLP = (fc) => 1 - Math.exp((-TAU * Math.min(fc, SR * 0.45)) / SR);
const coefHP = (fc) => { const rc = 1 / (TAU * fc), dt = 1 / SR; return rc / (rc + dt); };
const lp = (fc) => { const a = coefLP(fc); let y = 0; return (x) => (y += a * (x - y)); };
const hp = (fc) => { const a = coefHP(fc); let y = 0, px = 0; return (x) => { y = a * (y + x - px); px = x; return y; }; };
const saw = (ph) => (ph % 1) * 2 - 1;
const sq = (ph) => ((ph % 1) < 0.5 ? 1 : -1);
const tri = (ph) => 1 - 4 * Math.abs((ph % 1) - 0.5);

// ---------------------------------------------------------------- engine
function makeCtx(dur, seed) {
  const N = Math.ceil(dur * SR);
  const L = new Float32Array(N), R = new Float32Array(N), FX = new Float32Array(N);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  // add a voice: fn(t, p) → sample; pan -1..1; send = reverb amount
  function add(t0, len, fn, pan = 0, send = 0.15) {
    const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    const i0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      if (i < 0) continue;
      if (i >= N) break;
      const v = fn(k / SR, k / n);
      L[i] += v * gl; R[i] += v * gr; FX[i] += v * send;
    }
  }
  return { N, L, R, FX, rand, add };
}

// instruments: each takes the ctx first
const I = {
  marimba: (c, t0, m, a, pan = 0) => { const f = hz(m); c.add(t0, 1.0, (t) => a * Math.min(1, t / 0.002) * (Math.sin(TAU * f * t) * Math.exp(-t / 0.32) + 0.3 * Math.sin(TAU * 4 * f * t) * Math.exp(-t / 0.05)), pan, 0.2); },
  kalimba: (c, t0, m, a, pan = 0) => { const f = hz(m); c.add(t0, 1.4, (t) => a * Math.min(1, t / 0.002) * (Math.sin(TAU * f * t) * Math.exp(-t / 0.5) + 0.22 * Math.sin(TAU * 5.4 * f * t) * Math.exp(-t / 0.04)), pan, 0.3); },
  rhodes: (c, t0, m, a, len = 1.8, pan = 0) => { const f = hz(m); c.add(t0, len, (t, p) => a * Math.min(1, t / 0.01) * Math.exp(-t / 1.1) * (1 - p) ** 0.5 * (Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * f * t) * Math.exp(-t / 0.3)) + 0.2 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.2)) * (1 + 0.22 * Math.sin(TAU * 4.5 * t)), pan, 0.25); },
  piano: (c, t0, m, a, len = 2.4, pan = 0) => { const f = hz(m); c.add(t0, len, (t, p) => a * Math.min(1, t / 0.003) * (1 - p) ** 0.6 * (Math.sin(TAU * f * t) * Math.exp(-t / 1.2) + 0.35 * Math.sin(TAU * 2.001 * f * t) * Math.exp(-t / 0.45) + 0.12 * Math.sin(TAU * 3 * f * t) * Math.exp(-t / 0.2)), pan, 0.3); },
  pluck: (c, t0, m, a, dec = 0.12, pan = 0, cut = 2600) => { const f = hz(m); const l = lp(cut); c.add(t0, dec * 5, (t) => a * l(saw(f * t)) * Math.exp(-t / dec), pan, 0.18); },
  bass: (c, t0, m, a, len = 0.5) => { const f = hz(m); c.add(t0, len, (t, p) => a * Math.min(1, t / 0.006) * Math.exp(-t / 0.35) * (1 - p) ** 0.3 * (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t)), 0, 0); },
  sub: (c, t0, m, a, len = 0.8) => { const f = hz(m); let ph = 0; c.add(t0, len, (t, p) => { ph += f * (1 + 0.5 * Math.exp(-t / 0.03)) / SR; return a * Math.tanh(1.6 * Math.sin(TAU * ph)) * Math.min(1, t / 0.004) * (1 - p) ** 0.8; }, 0, 0); },
  // amapiano-style log drum: woody sine with a fast downward bend and a little grit
  logdrum: (c, t0, m, a, len = 0.42) => { const f = hz(m); let ph = 0; c.add(t0, len, (t, p) => { ph += f * (1 + 0.9 * Math.exp(-t / 0.012)) / SR; return a * Math.tanh(2.2 * Math.sin(TAU * ph)) * Math.exp(-t / 0.16) * (1 - p); }, 0, 0.05); },
  kick: (c, t0, a, tight = 0.1) => { let ph = 0; c.add(t0, 0.35, (t) => { ph += (45 + 90 * Math.exp(-t / 0.028)) / SR; return a * Math.sin(TAU * ph) * Math.exp(-t / tight) + a * 0.3 * Math.exp(-t / 0.002) * (c.rand() * 2 - 1); }, 0, 0); },
  snare: (c, t0, a, pan = 0, dark = 5000) => { const h = hp(900), l = lp(dark); c.add(t0, 0.25, (t) => a * (0.8 * l(h(c.rand() * 2 - 1)) * Math.exp(-t / 0.06) + 0.5 * Math.sin(TAU * 190 * t) * Math.exp(-t / 0.04)), pan, 0.3); },
  clap: (c, t0, a, pan = 0) => { const h = hp(900), l = lp(3600); c.add(t0, 0.22, (t) => { const env = t < 0.03 ? (Math.exp(-((t % 0.01) / 0.003))) : Math.exp(-(t - 0.03) / 0.06); return a * l(h(c.rand() * 2 - 1)) * env; }, pan, 0.35); },
  hat: (c, t0, a, pan = 0.3, open = false) => { const h = hp(7500); c.add(t0, open ? 0.3 : 0.06, (t) => a * h(c.rand() * 2 - 1) * Math.exp(-t / (open ? 0.09 : 0.014)), pan, 0.05); },
  shaker: (c, t0, a, pan = -0.35) => { const h = hp(5000), l = lp(11000); c.add(t0, 0.09, (t, p) => a * l(h(c.rand() * 2 - 1)) * Math.sin(Math.PI * p) ** 2, pan, 0.08); },
  rim: (c, t0, a, pan = 0.2) => c.add(t0, 0.06, (t) => a * (Math.sin(TAU * 1700 * t) * 0.6 + Math.sin(TAU * 820 * t)) * Math.exp(-t / 0.012), pan, 0.2),
  conga: (c, t0, m, a, pan = -0.3) => { const f = hz(m); c.add(t0, 0.4, (t) => a * Math.sin(TAU * f * t * (1 + 0.06 * Math.exp(-t / 0.02))) * Math.exp(-t / 0.13), pan, 0.2); },
  tom: (c, t0, m, a, pan = 0) => { const f = hz(m); const l = lp(500); c.add(t0, 0.9, (t) => a * (Math.sin(TAU * f * t * (1 + 0.25 * Math.exp(-t / 0.05))) * Math.exp(-t / 0.3) + 0.3 * l(c.rand() * 2 - 1) * Math.exp(-t / 0.05)), pan, 0.35); },
  timp: (c, t0, m, a) => { const f = hz(m); const l = lp(400); c.add(t0, 1.6, (t) => a * (Math.sin(TAU * f * t * (1 + 0.08 * Math.exp(-t / 0.05))) * Math.exp(-t / 0.55) + 0.5 * l(c.rand() * 2 - 1) * Math.exp(-t / 0.06)), 0, 0.4); },
  // detuned-saw pad through a low-pass; `bright` opens the filter
  pad: (c, t0, len, notes, a, bright = 1200, pan = 0) => {
    notes.forEach((m, i) => {
      const f = hz(m); const l1 = lp(bright), l2 = lp(bright);
      const pn = pan + (i % 2 ? 0.35 : -0.35);
      c.add(t0, len + 1.0, (t) => {
        const env = Math.min(1, t / 0.5) * (t > len ? Math.max(0, 1 - (t - len) / 1.0) : 1);
        return a * env * l2(l1(saw(f * t) + saw(f * 1.004 * t + 0.3) + 0.5 * saw(f * 0.996 * t + 0.6))) * 0.4;
      }, pn, 0.45);
    });
  },
  stab: (c, t0, notes, a, len = 0.45, pan = 0) => {
    notes.forEach((m, i) => {
      const f = hz(m); let y = 0;
      c.add(t0, len, (t, p) => {
        const s = saw(f * t) + saw(f * 1.006 * t);
        y += coefLP(300 + 4200 * Math.exp(-t / 0.12)) * (s - y);
        return a * y * Math.min(1, t / 0.008) * (1 - p) ** 1.5;
      }, pan + (i % 2 ? 0.2 : -0.2), 0.35);
    });
  },
  // pulsing synth whose filter follows `open` (0..1)
  pulse: (c, t0, m, a, len, open, pan = 0) => { const f = hz(m); const l = lp(400 + 3800 * open); c.add(t0, len, (t, p) => a * l(sq(f * t) * 0.6 + saw(f * 1.003 * t) * 0.4) * Math.min(1, t / 0.004) * Math.exp(-t / (len * 0.6)), pan, 0.25); },
  riser: (c, t0, len, a) => { const h = hp(800); c.add(t0, len, (t, p) => { const l = 0.5 + 0.5 * p; return a * p * p * h(c.rand() * 2 - 1) * l + a * 0.4 * p * Math.sin(TAU * (200 + 1400 * p * p) * t); }, 0, 0.5); },
  crash: (c, t0, a) => { const h = hp(4000); c.add(t0, 2.4, (t) => a * h(c.rand() * 2 - 1) * Math.exp(-t / 0.7), 0, 0.4); },
  crackle: (c, t0, len, a) => { const l = lp(3000); c.add(t0, len, () => { const r = c.rand(); return a * (r > 0.9993 ? (c.rand() * 2 - 1) * 3 : 0) + a * 0.05 * l(c.rand() * 2 - 1); }, 0, 0); },
};

// ---------------------------------------------------------------- tracks
// bar(c, t0, b) is called for every body bar. b = { i, beat, n, section ("intro"|"A"|"B"),
// k (bar index inside its 8-bar section), last (last bar of the section), ch (chord) }.
// end(c, t0, b) plays the resolving ending chord at the end point.
export const TRACKS = {
  liftoff: {
    title: "Liftoff",
    mood: "Bright, hopeful marimba pop",
    bestFor: "Opportunity spotlights, scholarship/job promos, CTAs",
    bpm: 108, key: "C major",
    chords: [{ r: 48, t: [60, 64, 67] }, { r: 43, t: [59, 62, 67] }, { r: 45, t: [57, 60, 64] }, { r: 41, t: [57, 60, 65] }],
    bar(c, t0, b) {
      const E = b.beat / 2, ch = b.ch, full = b.section === "B";
      const ARP = [0, 2, 1, 2, 3, 2, 1, 2];
      if (b.section !== "intro") I.pad(c, t0, b.beat * 4 - 0.2, ch.t, full ? 0.05 : 0.035, 1600);
      for (let e = 0; e < 8; e++) {
        const t = t0 + e * E, i = ARP[e], m = i === 3 ? ch.t[0] + 12 : ch.t[i];
        I.marimba(c, t, m + (e % 2 ? 12 : 0), 0.2, e % 2 ? 0.35 : -0.35);
        if (b.section === "intro") continue;
        if (e % 2 === 0) { I.kick(c, t, 0.42); I.bass(c, t, ch.r + (e === 4 ? 7 : 0), 0.3, 0.45); }
        if (full && (e === 2 || e === 6)) I.clap(c, t, 0.2);
        I.hat(c, t + E / 2, 0.06, 0.4);
      }
      if (full) [0, 3, 6].forEach((s, j) => I.pluck(c, t0 + s * E, ch.t[(j + b.k) % 3] + 24, 0.06, 0.1, 0.5));
      if (b.last && full) [4, 5, 6, 7].forEach((e) => I.snare(c, t0 + e * E, 0.08 + e * 0.02));
    },
    end(c, t0) {
      [48, 60, 64, 67, 72, 76].forEach((m, i) => I.marimba(c, t0 + i * 0.03, m, 0.32, (i - 2.5) / 4));
      I.bass(c, t0, 36, 0.5, 2.4); I.kick(c, t0, 0.5); I.crash(c, t0, 0.08);
      I.pad(c, t0, 2.2, [60, 64, 67, 72], 0.06, 2000);
    },
  },

  afroglow: {
    title: "Afro Glow",
    mood: "Warm Afrobeats / amapiano groove",
    bestFor: "Community stories, lifestyle, events, Nigerian-audience promos",
    bpm: 104, key: "A minor",
    chords: [{ r: 45, t: [57, 60, 64, 67] }, { r: 41, t: [57, 60, 64, 65] }, { r: 48, t: [55, 60, 64, 67] }, { r: 43, t: [55, 59, 62, 67] }],
    bar(c, t0, b) {
      const S = b.beat / 4, ch = b.ch, full = b.section === "B", intro = b.section === "intro";
      const sw = (s) => t0 + s * S + (s % 2 ? S * 0.12 : 0); // 16th swing
      for (let s = 0; s < 16; s++) I.shaker(c, sw(s), s % 2 ? 0.07 : 0.035);
      [2, 6, 10, 14].forEach((s) => I.rhodes(c, sw(s), ch.t[1] + 12, 0.035, 0.35, -0.2));
      [2, 6, 10, 14].forEach((s) => ch.t.slice(2).forEach((m) => I.rhodes(c, sw(s), m + 12, 0.03, 0.35, 0.2)));
      if (intro) return;
      [0, 8].forEach((s) => I.kick(c, sw(s), 0.45));
      if (full) I.kick(c, sw(14), 0.22);
      I.clap(c, sw(12), 0.17, 0.1);
      [3, 6, 10, 13].forEach((s) => I.rim(c, sw(s), 0.11));
      // log drum bass line
      [[0, 0], [3, 0], [7, 12], [10, 7], [12, 0]].forEach(([s, o]) => I.logdrum(c, sw(s), ch.r - 12 + o, 0.34));
      if (full) {
        [[0, 0], [3, 2], [6, 4], [8, 7], [11, 4], [14, 2]].forEach(([s, j]) => {
          const scale = [69, 72, 74, 76, 79, 81, 84, 86];
          if ((s + b.k) % 3 !== 1) I.kalimba(c, sw(s), scale[(j + b.k) % scale.length], 0.09, 0.4);
        });
        [5, 9, 15].forEach((s, j) => I.conga(c, sw(s), [62, 67, 64][j], 0.12));
      }
      if (b.last && full) [12, 13, 14, 15].forEach((s, j) => I.conga(c, sw(s), [67, 64, 62, 60][j], 0.16, 0.3));
    },
    end(c, t0) {
      [57, 64, 69, 72, 76].forEach((m, i) => I.kalimba(c, t0 + i * 0.05, m, 0.18, (i - 2) / 3));
      I.logdrum(c, t0, 33, 0.45, 0.9); I.kick(c, t0, 0.5);
      I.pad(c, t0, 2.2, [57, 60, 64, 69], 0.05, 1500);
      I.rhodes(c, t0, 69, 0.08, 2.4);
    },
  },

  nightshift: {
    title: "Night Shift",
    mood: "Lo-fi, calm, focused",
    bestFor: "How-tos, walkthroughs, explainers, study/productivity content",
    bpm: 80, key: "C major (jazzy 7ths)",
    chords: [{ r: 41, t: [57, 60, 64, 65] }, { r: 40, t: [55, 59, 62, 64] }, { r: 38, t: [53, 57, 60, 62] }, { r: 48, t: [55, 59, 60, 64] }],
    bar(c, t0, b) {
      const E = b.beat / 2, ch = b.ch, full = b.section === "B", intro = b.section === "intro";
      const sw = (e) => t0 + e * E + (e % 2 ? E * 0.18 : 0); // lazy swing
      I.crackle(c, t0, b.beat * 4, 0.05);
      ch.t.forEach((m, i) => I.rhodes(c, t0 + i * 0.018, m, 0.07, b.beat * 4 - 0.1, (i - 1.5) / 4));
      if (intro) return;
      [0, 5].forEach((e) => I.kick(c, sw(e), 0.5, 0.14));
      [2, 6].forEach((e) => I.snare(c, sw(e), 0.2, 0, 2600));
      for (let e = 0; e < 8; e++) I.hat(c, sw(e), e % 2 ? 0.035 : 0.055, 0.35);
      I.bass(c, t0, ch.r, 0.32, b.beat * 1.6); I.bass(c, sw(5), ch.r + 7, 0.22, b.beat);
      if (full) {
        const mel = [[1, 2], [3, 3], [4.5, 1], [6, 2]];
        mel.forEach(([e, j]) => { if ((b.k + e) % 4 !== 3) I.piano(c, t0 + e * E, ch.t[j] + 12, 0.07, 1.6, 0.3); });
      }
    },
    end(c, t0) {
      [48, 55, 59, 64, 67, 71].forEach((m, i) => I.rhodes(c, t0 + i * 0.05, m, 0.08, 3.2, (i - 2.5) / 4));
      I.bass(c, t0, 36, 0.32, 2.4);
      I.crackle(c, t0, 3.2, 0.05);
    },
  },

  headline: {
    title: "Headline",
    mood: "Newsy, ticking, data-driven tension",
    bestFor: "Stats, deadlines, 'did you know' facts, news-style skits",
    bpm: 120, key: "D minor",
    chords: [{ r: 38, t: [50, 53, 57] }, { r: 34, t: [50, 53, 58] }, { r: 36, t: [48, 52, 55] }, { r: 33, t: [49, 52, 57] }],
    bar(c, t0, b) {
      const S = b.beat / 4, ch = b.ch, full = b.section === "B", intro = b.section === "intro";
      I.pad(c, t0, b.beat * 4 - 0.25, ch.t.map((m) => m + 12), 0.035, 900);
      for (let s = 0; s < 16; s++) {
        const t = t0 + s * S;
        I.pluck(c, t, (s % 4 === 0 ? ch.t[0] : s % 2 ? ch.t[2] : ch.t[1]) + 24, s % 4 === 0 ? 0.075 : 0.04, 0.05, s % 2 ? 0.4 : -0.4);
        if (intro) continue;
        if (s % 8 === 0) { I.kick(c, t, 0.4); I.bass(c, t, ch.r, 0.18, 0.9); }
        if (s % 2 === 1) I.hat(c, t, 0.025);
        if (full && (s === 4 || s === 12)) I.snare(c, t, 0.12, 0, 3500);
      }
      if (!intro && b.k === 0) { I.timp(c, t0, ch.r, 0.5); I.stab(c, t0, ch.t.map((m) => m + 12), 0.1, 0.5); }
      if (full && b.k % 2 === 1) [0, 0.75, 1.5].forEach((d, j) => I.stab(c, t0 + b.beat * 2 + d * S * 2, ch.t.map((m) => m + 12 + (j === 2 ? 2 : 0)), 0.06, 0.18));
      if (b.last && !intro) [12, 13, 14, 15].forEach((s) => I.tom(c, t0 + s * S, 45 - (s - 12) * 2, 0.22));
    },
    end(c, t0) {
      I.timp(c, t0, 38, 0.7); I.stab(c, t0, [50, 57, 62, 65, 69], 0.14, 1.4);
      I.kick(c, t0, 0.5); I.crash(c, t0, 0.07);
      I.pad(c, t0, 2.2, [50, 57, 62, 65], 0.05, 1200);
    },
  },

  bigstage: {
    title: "Big Stage",
    mood: "Cinematic, building, anthem",
    bestFor: "Launches, keynotes, big announcements, milestone reveals",
    bpm: 92, key: "E minor",
    chords: [{ r: 40, t: [52, 55, 59] }, { r: 36, t: [52, 55, 60] }, { r: 43, t: [50, 55, 59] }, { r: 38, t: [50, 54, 57] }],
    bar(c, t0, b) {
      const E = b.beat / 2, ch = b.ch, full = b.section === "B", intro = b.section === "intro";
      const open = intro ? 0.1 : full ? 0.55 + 0.05 * b.k : 0.15 + 0.05 * b.k;
      for (let e = 0; e < 8; e++) I.pulse(c, t0 + e * E, ch.r + 12, 0.12, E * 0.95, open, e % 2 ? 0.3 : -0.3);
      I.pad(c, t0, b.beat * 4 - 0.2, ch.t.map((m) => m + 12), full ? 0.055 : 0.035, full ? 2400 : 1300);
      if (intro) return;
      I.sub(c, t0, ch.r - 12, 0.35, b.beat * 2); I.sub(c, t0 + b.beat * 2, ch.r - 12, 0.3, b.beat * 2);
      [0, 2].forEach((q) => I.kick(c, t0 + q * b.beat, 0.48, 0.14));
      if (full) {
        [1, 3].forEach((q) => I.snare(c, t0 + q * b.beat, 0.2, 0, 6000));
        for (let e = 0; e < 8; e++) I.hat(c, t0 + e * E, 0.04);
        if (b.k === 0) I.crash(c, t0, 0.07);
        I.piano(c, t0, ch.t[2] + 24, 0.06, 2.4, 0.3);
      } else if (b.k >= 4) [1.5, 3.5].forEach((q) => I.tom(c, t0 + q * b.beat, 43, 0.25));
      if (b.last && b.section === "A") I.riser(c, t0, b.beat * 4, 0.12);
      if (b.last && full) [8, 9, 10, 11, 12, 13, 14, 15].forEach((s) => I.tom(c, t0 + s * b.beat / 4, 47 - (s - 8), 0.12 + 0.02 * (s - 8)));
    },
    end(c, t0) {
      I.kick(c, t0, 0.6, 0.2); I.timp(c, t0, 40, 0.6); I.crash(c, t0, 0.1);
      I.sub(c, t0, 28, 0.4, 2.6);
      I.pad(c, t0, 2.6, [52, 59, 64, 67, 71], 0.07, 2600);
      I.stab(c, t0, [52, 59, 64, 67], 0.1, 1.2);
    },
  },
};

// ---------------------------------------------------------------- mixdown
function reverb(FX) {
  const N = FX.length;
  const outL = new Float32Array(N), outR = new Float32Array(N);
  const combs = (lens) => lens.map((n) => ({ buf: new Float32Array(n), i: 0, f: 0 }));
  const cl = combs([1557, 1617, 1491, 1422]), cr = combs([1580, 1640, 1514, 1445]);
  const aps = (lens) => lens.map((n) => ({ buf: new Float32Array(n), i: 0 }));
  const al = aps([556, 441]), ar = aps([579, 464]);
  const fb = 0.8, damp = 0.3;
  const run = (cs, as, x) => {
    let y = 0;
    for (const c of cs) { const o = c.buf[c.i]; c.f = o * (1 - damp) + c.f * damp; c.buf[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.buf.length; y += o; }
    for (const a of as) { const o = a.buf[a.i]; const v = -y + o; a.buf[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.buf.length; y = v; }
    return y;
  };
  for (let i = 0; i < N; i++) { const x = FX[i] * 0.03; outL[i] = run(cl, al, x); outR[i] = run(cr, ar, x); }
  return [outL, outR];
}

// render(id, dur, { endAt }) → { L, R } normalised stereo buffers
export function render(id, dur, opts = {}) {
  const T = TRACKS[id];
  if (!T) throw new Error("unknown track " + id + " (have: " + Object.keys(TRACKS).join(", ") + ")");
  const c = makeCtx(dur, opts.seed || 7);
  const beat = 60 / T.bpm, bar = beat * 4;
  const endAt = opts.endAt != null ? opts.endAt : Math.max(bar * 3, dur - 3);
  // whole bars counted back from endAt; the first (intro) bar may start before 0 so there is
  // sound from the very first frame and the last bar line still lands exactly on endAt
  const nBars = Math.ceil(endAt / bar - 0.01);
  const start = endAt - nBars * bar;
  for (let i = 0; i < nBars; i++) {
    const section = i < 2 ? "intro" : Math.floor((i - 2) / 8) % 2 ? "B" : "A";
    const k = i < 2 ? i : (i - 2) % 8;
    const last = (i >= 2 && k === 7) || i === nBars - 1;
    T.bar(c, start + i * bar, { i, n: nBars, beat, section, k, last, ch: T.chords[i % T.chords.length] });
  }
  T.end(c, endAt, { beat });
  const [rl, rr] = reverb(c.FX);
  const L = c.L, R = c.R, N = c.N;
  for (let i = 0; i < N; i++) { L[i] += rl[i]; R[i] += rr[i]; }
  // fade out whatever rings past the end
  const fadeN = Math.min(N, Math.floor(1.2 * SR));
  for (let i = N - fadeN; i < N; i++) { const g = (N - i) / fadeN; L[i] *= g; R[i] *= g; }
  // same loudness for every track: RMS to -18 dBFS, then a soft ceiling at about -1 dBFS
  let sum = 0;
  for (let i = 0; i < N; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / (2 * N)) || 1, g = 0.126 / rms;
  for (let i = 0; i < N; i++) { L[i] = 0.89 * Math.tanh((L[i] * g) / 0.89); R[i] = 0.89 * Math.tanh((R[i] * g) / 0.89); }
  return { L, R, endAt, start, bars: nBars, bpm: T.bpm };
}

export function writeWav(file, { L, R }) {
  const N = L.length;
  const out = Buffer.alloc(44 + N * 4);
  out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, out);
}
