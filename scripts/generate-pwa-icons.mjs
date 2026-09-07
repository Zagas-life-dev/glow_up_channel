/**
 * Generate the PWA icon set from the app icon.
 *
 * Source is public/images/"Yellow and Black Modern Media Company Logo (14).png"
 * — the UP wordmark the navbar, footer and sidebar already use. It is the app's
 * identity, so it is what belongs on the home screen; the icons are generated
 * from it rather than exported by hand because the `any` and `maskable` variants
 * need genuinely different treatment and the declared sizes have to match the
 * real bitmaps.
 *
 * What the source gives us, measured rather than assumed:
 *   500x500, rounded corners with transparency outside them
 *   background  #0B1222   (the app's own dark ground)
 *   wordmark    #FF6700   (brand orange), spanning 59.6% x 34.8% of the canvas
 *
 * That last figure is why no rescaling is needed for `maskable`: the wordmark's
 * half-diagonal is 0.345 of the canvas against Android's 0.400 safe radius, so it
 * survives the adaptive-icon crop at full size. All the maskable variants have to
 * do is fill the transparent corners, because a mask applies its own shape and a
 * transparent corner under it reads as a hole.
 *
 * Run: pnpm icons:pwa
 */
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(root, "public/images/Yellow and Black Modern Media Company Logo (14).png")
const OUT = join(root, "public/icons")

/** Sampled from the source, and the same colour as the manifest's background. */
const BG = { r: 0x0b, g: 0x12, b: 0x22, alpha: 1 }

const SOURCE_SIZE = 500

/** Measured bounding box of the orange wordmark in the source. */
const MARK = { left: 104, top: 171, width: 298, height: 174 }

/**
 * Margin kept around the wordmark when cropping the source's interior.
 *
 * The masked variants are built from a crop rather than from the whole tile
 * because the source's rounded corner carries a slightly lighter rim — 28,35,50
 * against the 11,18,34 ground. Composited onto a full-bleed background that rim
 * survives as a faint outline of the original rounded square, which is exactly
 * the ghost a mask would then put on display. Cropping well inside the corner
 * arcs avoids it entirely, and re-centres the wordmark on the way through.
 */
const CROP_PAD = 24

async function write(name, image) {
  await image.png({ compressionLevel: 9 }).toFile(join(OUT, name))
  return name
}

/** Artwork as designed: rounded corners kept, transparency kept. This is what a
 *  platform shows when it is not going to mask anything. */
async function anyIcon(size, name) {
  return write(name, sharp(SRC).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }))
}

/** Full-bleed: corners filled and the wordmark centred, ready to be cropped to
 *  whatever shape the platform prefers. Also used for the Apple touch icon,
 *  which iOS rounds itself and renders against black if left transparent. */
async function maskedIcon(size, name) {
  const scale = size / SOURCE_SIZE
  const crop = {
    left: MARK.left - CROP_PAD,
    top: MARK.top - CROP_PAD,
    width: MARK.width + CROP_PAD * 2,
    height: MARK.height + CROP_PAD * 2,
  }

  // Scaled by the same factor the whole tile would have been, so the wordmark
  // keeps the proportion it has in the source (59.6% of the width) instead of
  // being enlarged to fill the crop.
  const mark = await sharp(SRC)
    .extract(crop)
    .resize(Math.round(crop.width * scale), Math.round(crop.height * scale))
    .toBuffer()

  return write(
    name,
    sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([
      { input: mark, gravity: "centre" },
    ])
  )
}

/**
 * The notification badge is drawn as a monochrome stencil — Android keeps only
 * the alpha channel — so it is built from the wordmark's own pixels rather than
 * the whole tile, which would otherwise reduce to a featureless filled square.
 */
async function badgeIcon(size, name) {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const alpha = Buffer.alloc(width * height, 0)

  for (let i = 0, p = 0; p < width * height; p++, i += channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    // The orange wordmark against the dark ground; everything else drops out.
    if (a > 128 && r > 180 && g > 40 && g < 170 && b < 80) alpha[p] = 255
  }

  const stencil = await sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()

  // Trimmed to the wordmark, then padded, so the glyph is as large as the badge
  // allows instead of carrying the source's empty margin into a 96px tile.
  const mark = await sharp(stencil)
    .trim()
    .resize(Math.round(size * 0.8), Math.round(size * 0.8), { fit: "inside" })
    .toBuffer()

  return write(
    name,
    sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: mark, gravity: "centre" }])
  )
}

await mkdir(OUT, { recursive: true })

const written = [
  await anyIcon(192, "icon-192.png"),
  await anyIcon(512, "icon-512.png"),
  await maskedIcon(192, "icon-maskable-192.png"),
  await maskedIcon(512, "icon-maskable-512.png"),
  await maskedIcon(180, "apple-touch-icon.png"),
  await badgeIcon(96, "badge-96.png"),
]

console.log("Wrote public/icons/:\n  " + written.join("\n  "))
