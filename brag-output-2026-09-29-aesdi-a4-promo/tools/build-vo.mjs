// Lays the voiceover lines on the timeline and writes assets/data/vo.js.
// Real timing comes from assets/vo/Lxx.wav + Lxx.words.json (HeyGen word timestamps);
// a line without them gets an estimated timing so the film can be built before the voice exists.
// Also rewrites the <!-- VO:BEGIN/END --> audio block and the root data-duration in index.html.
//
//   node tools/build-vo.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/vo-lines.json"), "utf8"));
const r3 = (v) => Math.round(v * 1000) / 1000;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function wavDuration(file) {
  const b = fs.readFileSync(file);
  let off = 12, byteRate = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = b.readUInt32LE(off + 16);
    if (id === "data") return size / byteRate;
    off += 8 + size + (size % 2);
  }
  throw new Error("no data chunk in " + file);
}

function estimate(text) {
  let t = 0.05;
  const words = [];
  for (const w of text.split(/\s+/)) {
    const d = 0.11 + 0.042 * norm(w).length;
    words.push({ text: w, start: t, end: t + d });
    t += d + (/[.:]$/.test(w) ? 0.32 : /,$/.test(w) ? 0.16 : 0.01);
  }
  return { words, dur: words.at(-1).end + 0.15 };
}

// Merge spoken tokens into display tokens ("A E S D I" -> "AESDI") for the subtitles.
function toDisplay(words) {
  const out = [];
  for (let i = 0; i < words.length; ) {
    let hit = null;
    for (const [spoken, shown] of cfg.display) {
      const target = norm(spoken);
      let acc = "";
      for (let j = i; j < words.length && acc.length < target.length; j++) {
        acc += norm(words[j].text);
        if (acc === target) { hit = { j, shown }; break; }
      }
      if (hit) break;
    }
    if (hit) {
      const trail = (words[hit.j].text.match(/[.,:!?]+$/) || [""])[0];
      out.push({ t: hit.shown + trail, s: words[i].s, e: words[hit.j].e });
      i = hit.j + 1;
    } else {
      out.push({ t: words[i].text, s: words[i].s, e: words[i].e });
      i++;
    }
  }
  return out;
}

function chunk(tokens) {
  const chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  for (const tk of tokens) {
    cur.push(tk);
    const chars = cur.map((x) => x.t).join(" ").length;
    if (/[.:!?]$/.test(tk.t) || (/,$/.test(tk.t) && cur.length >= 3) || cur.length >= 5 || chars > 26) flush();
  }
  flush();
  return chunks.map((ws) => ({ s: ws[0].s, e: ws.at(-1).e, words: ws }));
}

let t = cfg.lead;
let real = 0;
const lines = cfg.lines.map((ln) => {
  const wav = path.join(ROOT, "assets/vo", ln.id + ".wav");
  const wj = path.join(ROOT, "assets/vo", ln.id + ".words.json");
  let words, dur, file = null;
  if (fs.existsSync(wav) && fs.existsSync(wj)) {
    words = JSON.parse(fs.readFileSync(wj, "utf8")).map((w) => ({ text: w.text, start: w.start, end: w.end }));
    dur = wavDuration(wav);
    file = "assets/vo/" + ln.id + ".wav";
    real++;
  } else {
    ({ words, dur } = estimate(ln.spoken));
  }
  t += ln.gapBefore || 0;
  const start = t;
  const abs = words.map((w) => ({ w: w.text, s: r3(start + w.start), e: r3(start + w.end) }));
  t = start + dur + cfg.gap;
  return { id: ln.id, file, start: r3(start), dur: r3(dur), end: r3(start + dur), words: abs };
});
const outroStart = r3(lines.at(-1).end + cfg.tail);
const duration = r3(outroStart + (cfg.outro || 0));
const subs = lines.map((l) => chunk(toDisplay(l.words.map((w) => ({ text: w.w, s: w.s, e: w.e })))));

const vo = { synthetic: real < lines.length, duration, outroStart, lines, subs };
fs.writeFileSync(path.join(ROOT, "assets/data/vo.js"), "window.VO = " + JSON.stringify(vo) + ";\n");

// Patch index.html: voice <audio> tags + root duration.
const idx = path.join(ROOT, "index.html");
let html = fs.readFileSync(idx, "utf8");
const tags = lines
  .filter((l) => l.file)
  .map((l) => `      <audio id="vo-${l.id}" src="${l.file}" data-start="${l.start}" data-duration="${l.dur}" data-track-index="20" data-volume="1"></audio>`)
  .join("\n");
html = html.replace(/<!-- VO:BEGIN -->[\s\S]*?<!-- VO:END -->/, `<!-- VO:BEGIN -->\n${tags}\n      <!-- VO:END -->`);
html = html.replace(/(<div[^>]*id="root"[^>]*data-duration=")[^"]*(")/, `$1${duration}$2`);

// Sound effects, placed on the same cues the composition animates to (mirrors cue()/SC in index.html).
const cue = (li, word, nth = 0) => {
  const q = norm(word);
  let k = 0;
  for (const w of lines[li].words) if (norm(w.w).startsWith(q)) { if (k === nth) return w.s; k++; }
  return lines[li].start;
};
const SC = lines.map((l, i) => (i === 0 ? 0 : l.start - 0.42));
const SE = SC.map((s, i) => (i < SC.length - 1 ? SC[i + 1] : duration));
const sfx = [
  ["sparkle", 0.35, 1.8, 0.22],
  ...["classroom", "scholarship", "chance"].map((w) => ["whoosh-short", cue(1, w) - 0.3, 0.57, 0.2]),
  ["riser", SE[2] - 1.5, 1.7, 0.3, 8.3],
  ["whoosh-cinematic", SE[2] + 0.25, 2.6, 0.42],
  ["impact-bass-1", cue(3, "four") - 0.18, 2.1, 0.45],
  ["sparkle", cue(3, "four") + 0.45, 1.8, 0.35],
  ...[4, 5, 6, 7, 8].map((k) => ["whoosh-short", SC[k] - 0.42, 0.57, 0.3]),
  ["chime", cue(5, "five") + 0.3, 2.5, 0.22],
  ...[["two", 0], ["twelve", 0], ["five", 0]].map(([w]) => ["pop", cue(7, w) - 0.3, 0.72, 0.3]),
  ["sparkle", SC[9] + 0.2, 1.8, 0.4],
  // UP end card: panel, arrow pop, U + P slide, lock
  ["whoosh-short", outroStart - 0.1, 0.57, 0.3],
  ["pop", outroStart + 0.28, 0.72, 0.45],
  ["whoosh", outroStart + 0.72, 0.57, 0.3],
  ["impact-bass-1", outroStart + 1.26, 2.1, 0.4],
];
const sfxTags = sfx
  .map(([name, t, d, v, ms], i) => {
    const media = ms ? ` data-media-start="${ms}"` : "";
    return `      <audio id="sfx-${String(i).padStart(2, "0")}-${name}" src="assets/sfx/${name}.mp3" data-start="${r3(Math.max(0, t))}" data-duration="${d}"${media} data-track-index="${30 + (i % 3)}" data-volume="${v}"></audio>`;
  })
  .join("\n");
html = html.replace(/<!-- SFX:BEGIN -->[\s\S]*?<!-- SFX:END -->/, `<!-- SFX:BEGIN -->\n${sfxTags}\n      <!-- SFX:END -->`);
fs.writeFileSync(idx, html);

console.log(`${real}/${lines.length} lines voiced · duration ${duration}s`);
for (const l of lines) console.log(`  ${l.id}  ${l.start.toFixed(2)}–${l.end.toFixed(2)}  (${l.dur.toFixed(2)}s)${l.file ? "" : "  [estimated]"}`);
