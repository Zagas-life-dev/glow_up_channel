/**
 * Recolour the UP logo to the platform palette without touching its shape.
 *
 * The logo files as supplied (assets/brand/originals/) are two-colour art in the
 * old brand values — orange ≈ #FF6700 and navy ≈ #0B1222 — while the platform
 * now uses the UP Design v1 tokens, #FF6A00 and #0B1233 (app/globals.css). Close,
 * but side by side on a navy sidebar the difference shows.
 *
 * Every pixel of a two-colour image sits somewhere on the line between its two
 * colours: fully one, fully the other, or a blend along an anti-aliased edge.
 * So each pixel is projected onto the old orange→navy line to get that blend
 * factor, and redrawn at the same factor between the new colours. Edges keep
 * their exact smoothing; only the two endpoints move. The factor is clamped
 * slightly at both ends so compression noise and the faint glow the orange
 * source carries around its letters settle onto the flat colours instead of
 * surviving as a halo.
 *
 * Writes public/images/brand/up-logo-orange.png (navy mark on orange) and
 * up-logo-navy.png (orange mark on navy), and recolours the in-app logo in
 * public/images/ in place. scripts/generate-pwa-icons.mjs builds
 * the icon set from these.
 *
 * Run: pnpm brand:recolor
 */
import sharp from "sharp"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { basename, dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(root, "assets/brand/originals")
const OUT = join(root, "public/images/brand")

/** UP Design v1 tokens. */
const ORANGE = [0xff, 0x6a, 0x00]
const NAVY = [0x0b, 0x12, 0x33]

/** Blend factors inside this band are stretched to 0..1; outside it they are
 *  flat colour. Narrow enough to leave real anti-aliasing alone. */
const CLEAN_LOW = 0.08
const CLEAN_HIGH = 0.92

const JOBS = [
  { from: join(SRC, "up-logo-orange.webp"), to: join(OUT, "up-logo-orange.png") },
  { from: join(SRC, "up-logo-navy.png"), to: join(OUT, "up-logo-navy.png") },
  // The in-app logo (navbar, sidebar, footer…): the same mark as a rounded navy
  // tile with transparent corners. Recoloured in place so its ~14 references
  // follow without an edit; the pre-recolour file is in git history. Its
  // transparent corners would poison the border sample, so its old colours are
  // given — measured when the PWA icons were first generated from it.
  {
    from: join(root, "public/images/Yellow and Black Modern Media Company Logo (14).png"),
    to: join(root, "public/images/Yellow and Black Modern Media Company Logo (14).png"),
    colours: { orange: [0xff, 0x67, 0x00], navy: [0x0b, 0x12, 0x22] },
    keepAlpha: true,
  },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Measure the two colours the image is actually made of, rather than trusting
 * the nominal values: the background from the border, the mark from the pixels
 * farthest from the background.
 */
function sampleColours(data, width, height, channels) {
  const at = (x, y) => {
    const o = (y * width + x) * channels
    return [data[o], data[o + 1], data[o + 2]]
  }
  const border = []
  for (let x = 0; x < width; x += 7) border.push(at(x, 2), at(x, height - 3))
  for (let y = 0; y < height; y += 7) border.push(at(2, y), at(width - 3, y))
  const bg = [0, 1, 2].map((c) => median(border.map((p) => p[c])))

  const dist = (p) => Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2])
  const pixels = []
  for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) pixels.push(at(x, y))
  const far = pixels.reduce((max, p) => Math.max(max, dist(p)), 0)
  const markPixels = pixels.filter((p) => dist(p) > far * 0.8)
  const mark = [0, 1, 2].map((c) => median(markPixels.map((p) => p[c])))
  return { bg, mark }
}

async function recolor({ from, to, colours, keepAlpha = false }) {
  const input = sharp(from)
  const { data, info } = await (keepAlpha ? input.ensureAlpha() : input.removeAlpha())
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  let oldO, oldN
  if (colours) {
    oldO = colours.orange
    oldN = colours.navy
  } else {
    const { bg, mark } = sampleColours(data, width, height, channels)
    // Which old colour is orange decides which new colour each end maps to.
    const bgIsOrange = bg[0] > mark[0]
    oldO = bgIsOrange ? bg : mark
    oldN = bgIsOrange ? mark : bg
  }
  const axis = [0, 1, 2].map((c) => oldN[c] - oldO[c])
  const axisLen2 = axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2

  const outChannels = keepAlpha ? 4 : 3
  const out = Buffer.alloc(width * height * outChannels)
  for (let p = 0, i = 0; p < width * height; p++, i += channels) {
    // Blend factor: 0 = orange, 1 = navy.
    let t =
      ((data[i] - oldO[0]) * axis[0] + (data[i + 1] - oldO[1]) * axis[1] + (data[i + 2] - oldO[2]) * axis[2]) /
      axisLen2
    t = Math.min(1, Math.max(0, (t - CLEAN_LOW) / (CLEAN_HIGH - CLEAN_LOW)))
    for (let c = 0; c < 3; c++) out[p * outChannels + c] = Math.round(ORANGE[c] + (NAVY[c] - ORANGE[c]) * t)
    if (keepAlpha) out[p * outChannels + 3] = data[i + 3]
  }

  // Encoded to memory first: one job writes over its own source.
  const png = await sharp(out, { raw: { width, height, channels: outChannels } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(to, png)
  const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("")
  return `${basename(to)}  ${width}x${height}  orange ${hex(oldO)} -> #ff6a00, navy ${hex(oldN)} -> #0b1233`
}

/**
 * The mark on its own, on transparency, in each brand colour — what the app's
 * logo component draws, so it can sit on any surface (a navy header, an orange
 * tile) without carrying a background square along.
 *
 * Taken from the recoloured orange logo: how navy each pixel is becomes its
 * alpha, which keeps the anti-aliased edge. Trimmed to the mark.
 */
async function transparentMarks() {
  const { data, info } = await sharp(join(OUT, "up-logo-orange.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const alpha = Buffer.alloc(width * height)
  for (let p = 0; p < width * height; p++) {
    // Red runs 255 (orange ground) → 11 (navy mark).
    const red = data[p * channels]
    alpha[p] = Math.round(Math.min(1, Math.max(0, (ORANGE[0] - red) / (ORANGE[0] - NAVY[0]))) * 255)
  }
  const lines = []
  for (const [name, colour] of [
    ["up-mark-navy.png", NAVY],
    ["up-mark-orange.png", ORANGE],
  ]) {
    const [r, g, b] = colour
    const png = await sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
      .joinChannel(alpha, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer()
    const trimmed = await sharp(png).trim().png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    await writeFile(join(OUT, name), trimmed.data)
    lines.push(`${name}  ${trimmed.info.width}x${trimmed.info.height}  transparent`)
  }
  return lines.join("\n")
}

await mkdir(OUT, { recursive: true })
for (const job of JOBS) console.log(await recolor(job))
console.log(await transparentMarks())
