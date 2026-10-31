// Renders a 1200x1200 cover per playlist: two-colour UP palette, real logo, Unbounded title, mascot blob.
// usage: node covers.cjs <playlists.json> <outDir> [onlyId]
// Needs this repo checkout: @napi-rs/canvas from its node_modules and the logo PNGs in public/images.
const fs = require('fs'), path = require('path');
const SKILL = __dirname + path.sep;
const ROOT = path.resolve(__dirname, '../../..') + path.sep;
const { GlobalFonts, createCanvas, loadImage } = require(ROOT + 'node_modules/@napi-rs/canvas');

GlobalFonts.registerFromPath(SKILL + 'assets/Unbounded-latin.woff2', 'Unbounded');
GlobalFonts.registerFromPath(SKILL + 'assets/PlusJakartaSans-latin.woff2', 'Jakarta');

const NAVY = '#0B1222', ORANGE = '#FF6700', ARM = '#E35B00', CREAM = '#F6EBD9', W = 1200;

// name fragment -> [kicker, tone]. tone 'navy' = navy page, 'orange' = orange page.
// Events and founder lists are orange, jobs and opportunities navy. Add a row for every new list.
const STYLE = [
  [/^Lagos events/, 'EVENTS · LAGOS', 'orange'],
  [/^Abuja/, 'EVENTS · ABUJA', 'orange'],
  [/^Ghana/, 'EVENTS · GHANA', 'orange'],
  [/^Ibadan/, 'EVENTS · IBADAN', 'orange'],
  [/^Creative events/, 'EVENTS · NIGERIA', 'orange'],
  [/^Founder summits/, 'FOUNDERS · NIGERIA', 'orange'],
  [/^Scholarships/, 'SCHOLARSHIPS · GLOBAL', 'navy'],
  [/^Free tech training/, 'TRAINING · FREE', 'navy'],
  [/^Grants/, 'FUNDING · AFRICA', 'navy'],
  [/^Fellowships/, 'FELLOWSHIPS · GLOBAL', 'navy'],
  [/^Graduate trainee/, 'JOBS · NIGERIA', 'navy'],
  [/^Lagos internships/, 'INTERNSHIPS · LAGOS', 'navy'],
  [/^Oil, gas/, 'JOBS · ENERGY', 'navy'],
  [/^Remote entry/, 'JOBS · REMOTE', 'navy'],
  [/^Remote creative/, 'JOBS · REMOTE', 'navy'],
  [/^Bank, finance/, 'JOBS · FINANCE', 'navy'],
  [/^Sales & marketing/, 'JOBS · SALES', 'navy'],
  [/^Remote & virtual internships/, 'INTERNSHIPS · REMOTE', 'navy'],
  [/^Engineering/, 'JOBS · ENGINEERING', 'navy'],
  [/^Tech jobs/, 'JOBS · TECH', 'navy'],
];

/** Crop the logo's orange (or navy) letters out of the official PNG, keeping its transparency-free look. */
async function logo(tone) {
  const file = tone === 'navy' ? 'UP Logo dark background (2).png' : 'UP logo bright background.png';
  const img = await loadImage(ROOT + 'public/images/' + file);
  const c = createCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  // Letter pixels: orange on the dark logo, dark on the bright one.
  const isInk = tone === 'navy' ? (r, gg, b) => r > 200 && gg > 70 && gg < 150 && b < 60 : (r, gg, b) => r < 60 && b < 80;
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) {
    const i = (y * img.width + x) * 4;
    if (isInk(d[i], d[i + 1], d[i + 2])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  // Re-draw letters only, as a mask in the brand colour, so the logo sits cleanly on either page colour.
  const w = x1 - x0, h = y1 - y0, out = createCanvas(w, h), og = out.getContext('2d');
  const src = g.getImageData(x0, y0, w, h), dst = og.createImageData(w, h);
  const ink = tone === 'navy' ? [255, 103, 0] : [11, 18, 34];
  for (let i = 0; i < src.data.length; i += 4) {
    if (isInk(src.data[i], src.data[i + 1], src.data[i + 2])) { dst.data[i] = ink[0]; dst.data[i + 1] = ink[1]; dst.data[i + 2] = ink[2]; dst.data[i + 3] = 255; }
  }
  og.putImageData(dst, 0, 0);
  return out;
}

function wrap(g, text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function mascot(g, cx, base, s, mood) {
  g.save(); g.translate(cx, base); g.scale(s, s);
  // Noodle arm waving up-left, then the body over its shoulder end.
  g.strokeStyle = ARM; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-150, -230); g.bezierCurveTo(-260, -260, -250, -380, -300, -430); g.stroke();
  g.fillStyle = ARM; g.beginPath(); g.arc(-305, -440, 34, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(150, -200); g.bezierCurveTo(230, -190, 260, -120, 300, -90); g.stroke();
  g.beginPath(); g.arc(305, -85, 30, 0, Math.PI * 2); g.fill();
  // Gumdrop body.
  g.fillStyle = ORANGE;
  g.beginPath(); g.moveTo(-250, 40);
  g.bezierCurveTo(-250, -200, -200, -470, 0, -470);
  g.bezierCurveTo(200, -470, 250, -200, 250, 40); g.closePath(); g.fill();
  // Googly eyes, right one bigger, pupils glancing up-left toward the title.
  const eye = (x, y, r, px, py) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 13; g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(x + px, y + py, r * 0.42, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + px + r * 0.14, y + py - r * 0.16, r * 0.12, 0, Math.PI * 2); g.fill();
  };
  eye(-75, -300, 66, -22 + mood.look, -20);
  eye(85, -310, 78, -26 + mood.look, -22);
  // Mouth.
  g.strokeStyle = NAVY; g.lineWidth = 14; g.lineCap = 'round';
  if (mood.mouth === 'o') { g.fillStyle = NAVY; g.beginPath(); g.ellipse(5, -165, 26, 32, 0, 0, Math.PI * 2); g.fill(); }
  else { g.beginPath(); g.arc(5, -205, mood.mouth === 'big' ? 70 : 52, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke(); }
  g.restore();
}

async function cover(list, out, logos) {
  const [, kicker, tone] = STYLE.find(([re]) => re.test(list.name)) || [null, 'PLAYLIST', 'navy'];
  const bg = tone === 'navy' ? NAVY : ORANGE, fg = tone === 'navy' ? '#FFFFFF' : NAVY, accent = tone === 'navy' ? ORANGE : NAVY;
  const c = createCanvas(W, W), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, W);

  // A big disc behind the mascot gives it a stage; on orange pages it keeps the orange blob visible.
  const seed = [...list.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  g.fillStyle = tone === 'navy' ? '#18233F' : NAVY;
  g.beginPath(); g.arc(930 + (seed % 5) * 8, 1060, 360, 0, Math.PI * 2); g.fill();

  // Header: real logo left, "PLAYLIST" pill right.
  const lg = logos[tone], lh = 74, lw = lg.width * lh / lg.height;
  g.drawImage(lg, 80, 80, lw, lh);
  g.font = '700 26px Jakarta';
  const pill = 'PLAYLIST', pw = g.measureText(pill).width + 52;
  g.strokeStyle = fg; g.lineWidth = 3;
  g.beginPath(); g.roundRect(W - 80 - pw, 86, pw, 62, 31); g.stroke();
  g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(pill, W - 80 - pw + 26, 118);

  // Kicker + title, sized to fit four lines in the upper two-thirds.
  g.textBaseline = 'alphabetic';
  g.font = '800 34px Jakarta'; g.fillStyle = accent;
  g.letterSpacing = '4px'; g.fillText(kicker, 80, 300); g.letterSpacing = '0px';
  let size = 118, lines;
  for (; size > 60; size -= 4) {
    g.font = `800 ${size}px Unbounded`;
    lines = wrap(g, list.name, W - 160);
    if (lines.length <= 4 && lines.length * size * 1.08 <= 470) break;
  }
  g.fillStyle = fg;
  lines.forEach((l, i) => g.fillText(l, 80, 300 + size * 1.15 + i * size * 1.08));

  // Footer. No item count: dead items drop out between runs and the cover would go stale.
  g.font = '700 38px Jakarta'; g.fillStyle = fg;
  g.fillText('Hand-picked, open now', 80, 1110);

  const moods = [{ look: 0, mouth: 'smile' }, { look: -6, mouth: 'big' }, { look: 4, mouth: 'o' }];
  mascot(g, 940 + (seed % 5) * 8, 1240, 0.82, moods[seed % moods.length]);

  const file = path.join(out, list.id + '.png');
  fs.writeFileSync(file, c.toBuffer('image/png'));
  return file;
}

(async () => {
  const [src, out, only] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const logos = { navy: await logo('navy'), orange: await logo('orange') };
  const mine = JSON.parse(fs.readFileSync(src, 'utf8')).mine.filter(l => !only || l.id === only);
  for (const l of mine) console.log(await cover(l, out, logos), l.name);
})();
