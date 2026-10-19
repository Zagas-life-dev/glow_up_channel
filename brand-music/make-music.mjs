// UP brand music: render a bed for a film, or rebuild the preview set.
//
//   node brand-music/make-music.mjs                                  → previews (60s each) into brand-music/tracks/
//   node brand-music/make-music.mjs <track> <seconds> <out.wav>      → a bed of exactly that length
//   node brand-music/make-music.mjs <track> <seconds> <out.wav> --end-at 95.4
//                                                                    → the ending chord lands at 95.4s
// Tracks: liftoff, afroglow, nightshift, headline, bigstage (see music-lib.mjs).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TRACKS, render, writeWav } from "./music-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? +args[i + 1] : undefined; };

function ffmpeg() {
  for (const p of [process.env.FFMPEG, "C:/hfout/bin/ffmpeg.exe", "ffmpeg"]) {
    if (!p) continue;
    try { execFileSync(p, ["-version"], { stdio: "ignore" }); return p; } catch {}
  }
  return null;
}

if (args.length >= 3 && !args[0].startsWith("--")) {
  const [id, secs, out] = args;
  const r = render(id, +secs, { endAt: flag("--end-at") });
  writeWav(out, r);
  console.log(`${id}: ${secs}s → ${out}  (${r.bpm} bpm, ${r.bars} bars from ${r.start.toFixed(2)}s, ending at ${r.endAt.toFixed(2)}s)`);
} else {
  const dir = path.join(HERE, "tracks");
  fs.mkdirSync(dir, { recursive: true });
  const ff = ffmpeg();
  for (const id of Object.keys(TRACKS)) {
    const wav = path.join(dir, id + ".wav");
    const r = render(id, 60);
    writeWav(wav, r);
    if (ff) {
      execFileSync(ff, ["-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-b:a", "192k", path.join(dir, id + ".mp3")]);
      fs.unlinkSync(wav);
    }
    console.log(`${id}: 60s preview (${r.bpm} bpm, ending at ${r.endAt.toFixed(2)}s)${ff ? " → mp3" : ""}`);
  }
}
