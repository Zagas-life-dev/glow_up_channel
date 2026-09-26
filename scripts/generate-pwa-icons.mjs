/**
 * Generate the PWA icon set and the iOS launch screens from the UP logo.
 *
 * Sources are the platform-coloured logo files written by
 * scripts/recolor-brand-logo.mjs (run that first if the originals change):
 *
 *   public/images/brand/up-logo-orange.png   navy mark on orange — the app icon
 *   public/images/brand/up-logo-navy.png     orange mark on navy — the launch screen
 *
 * Both are flat two-colour art, so the mark is cut out by colour and re-placed
 * on a canvas of exactly the background colour. That is what lets each variant
 * size the mark for its own job — `any`, `maskable`, Apple and the splash all
 * need different margins — instead of inheriting the source's.
 *
 * Also writes lib/pwa/apple-splash.generated.ts, which app/layout.tsx reads, so
 * the <link rel="apple-touch-startup-image"> list can never name a file that
 * was not generated or miss one that was.
 *
 * Run: pnpm icons:pwa
 */
import sharp from "sharp"
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const BRAND = join(root, "public/images/brand")
const ICONS = join(root, "public/icons")
const SPLASH = join(root, "public/splash")
const SPLASH_MODULE = join(root, "lib/pwa/apple-splash.generated.ts")

/** UP Design v1 tokens (app/globals.css) — the colours the logo was recoloured to. */
const ORANGE = "#FF6A00"
const NAVY = "#0B1233"

/**
 * Width of the mark as a share of the canvas, per variant.
 *
 * Maskable has to survive Android's adaptive-icon crop, whose safe zone is a
 * circle of radius 0.4 of the canvas. The mark is about 1.71:1, so its
 * half-diagonal is 0.579 × width; at 0.56 that is 0.324 — inside even the
 * tightest mask with room to read as centred.
 */
const RATIO = { any: 0.62, maskable: 0.56, apple: 0.6, badge: 0.9 }

/**
 * Cut the mark out of a two-colour logo: its bounding box, found by colour, plus
 * a few pixels so the anti-aliased edge comes along. The margin is the flat
 * background colour, so it disappears into any canvas of that colour.
 */
async function loadMark(file, markIsOrange) {
  const { data, info } = await sharp(join(BRAND, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let left = width, top = height, right = -1, bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Red separates the two colours cleanly: 255 in orange, 11 in navy.
      const red = data[(y * width + x) * channels]
      if (markIsOrange ? red > 133 : red < 133) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  const pad = 6
  const box = {
    left: Math.max(0, left - pad),
    top: Math.max(0, top - pad),
    width: Math.min(width, right + pad + 1) - Math.max(0, left - pad),
    height: Math.min(height, bottom + pad + 1) - Math.max(0, top - pad),
  }
  return sharp(join(BRAND, file)).removeAlpha().extract(box).png().toBuffer()
}

/** The mark scaled to `markWidth` px wide, ready to composite. */
const scaled = (mark, markWidth) => sharp(mark).resize({ width: Math.round(markWidth) }).png().toBuffer()

/** A canvas of the background colour — optionally a rounded tile on
 *  transparency — with the mark centred on it. */
async function tile(mark, { width, height = width, bg, radius = 0, ratio }) {
  const r = Math.round(Math.min(width, height) * radius)
  const ground = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" ry="${r}" fill="${bg}"/></svg>`
  )
  const markPx = await scaled(mark, Math.min(width, height) * ratio)
  return sharp(ground).composite([{ input: markPx, gravity: "centre" }])
}

/* ---------------------------------------------------------------------------
 * Icons
 * ------------------------------------------------------------------------- */

/** As designed: a rounded orange tile on transparency. What a platform shows
 *  when it is not going to apply its own mask (desktop install, Windows, the
 *  in-app install card). */
async function anyIcon(mark, size, name) {
  await (await tile(mark, { width: size, bg: ORANGE, radius: 0.22, ratio: RATIO.any }))
    .png({ compressionLevel: 9 })
    .toFile(join(ICONS, name))
  return name
}

/** Full bleed, so the platform can cut whatever shape it prefers without a
 *  transparent corner showing through as a hole. Also the Apple touch icon,
 *  which iOS rounds itself and renders against black if left transparent. */
async function fullBleedIcon(mark, size, name, ratio) {
  await (await tile(mark, { width: size, bg: ORANGE, ratio }))
    .flatten({ background: ORANGE })
    .png({ compressionLevel: 9 })
    .toFile(join(ICONS, name))
  return name
}

/** Android keeps only the alpha channel of a notification badge, so it is the
 *  mark alone, white, with its shape carried in alpha — taken from how navy
 *  each pixel of the orange logo is, which keeps the anti-aliasing. */
async function badgeIcon(size, name) {
  const { data, info } = await sharp(join(BRAND, "up-logo-orange.png"))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const alpha = Buffer.alloc(width * height)
  for (let p = 0; p < width * height; p++) {
    const red = data[p * channels]
    alpha[p] = Math.round(Math.min(1, Math.max(0, (255 - red) / (255 - 11))) * 255)
  }
  const stencil = await sharp({ create: { width, height, channels: 3, background: "#FFFFFF" } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
  const mark = await sharp(stencil).trim().resize({ width: Math.round(size * RATIO.badge) }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(join(ICONS, name))
  return name
}

/* ---------------------------------------------------------------------------
 * iOS launch screens
 *
 * iOS shows a blank white screen while an installed web app boots unless it is
 * handed a startup image whose pixel size matches the device exactly — there is
 * no scaling and no fallback. Hence one per device class, selected by media
 * query. The navy logo (orange mark on navy), which is also what Android shows:
 * the manifest's navy background_color behind the icon.
 * ------------------------------------------------------------------------- */

/** CSS width × height and pixel ratio, portrait. Covers every iPhone and iPad
 *  still on a Safari that supports installed web apps. */
const DEVICES = [
  [440, 956, 3], // iPhone 16 Pro Max
  [402, 874, 3], // iPhone 16 Pro
  [430, 932, 3], // iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [393, 852, 3], // iPhone 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12, 13, 14, 12/13 Pro
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 6/7/8 Plus
  [375, 667, 2], // iPhone 6/7/8, SE 2nd/3rd gen
  [320, 568, 2], // iPhone SE 1st gen
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11", iPad Air 11"
  [820, 1180, 2], // iPad Air 10.9", iPad 10th gen
  [834, 1112, 2], // iPad Air 10.5"
  [810, 1080, 2], // iPad 10.2"
  [768, 1024, 2], // iPad 9.7", iPad mini 7.9"
  [744, 1133, 2], // iPad mini 8.3"
]

/** Mark width on the launch screen, as a share of the short side. */
const SPLASH_RATIO = 0.42

async function splashScreens(mark) {
  await mkdir(SPLASH, { recursive: true })
  // Clear out old sizes so a device dropped from the list does not leave an
  // orphan behind in public/.
  for (const f of await readdir(SPLASH)) if (f.endsWith(".png")) await unlink(join(SPLASH, f))

  const entries = []
  for (const [cw, ch, dpr] of DEVICES) {
    const w = cw * dpr
    const h = ch * dpr
    const name = `apple-splash-${w}x${h}.png`
    // Two flat colours and their edge blend: a palette PNG is a fraction of the
    // size of a truecolour one and indistinguishable.
    await (await tile(mark, { width: w, height: h, bg: NAVY, ratio: SPLASH_RATIO }))
      .flatten({ background: NAVY })
      .png({ palette: true, compressionLevel: 9 })
      .toFile(join(SPLASH, name))
    entries.push({
      url: `/splash/${name}`,
      media: `(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })
  }

  await mkdir(dirname(SPLASH_MODULE), { recursive: true })
  await writeFile(
    SPLASH_MODULE,
    `// Generated by scripts/generate-pwa-icons.mjs — run \`pnpm icons:pwa\`, do not edit.\n` +
      `// Each entry is an exact device match; iOS neither scales nor falls back.\n\n` +
      `export const APPLE_SPLASH_SCREENS: { url: string; media: string }[] = ${JSON.stringify(entries, null, 2)}\n`
  )
  return entries.length
}

await mkdir(ICONS, { recursive: true })

const navyOnOrange = await loadMark("up-logo-orange.png", false)
const orangeOnNavy = await loadMark("up-logo-navy.png", true)

const written = [
  await anyIcon(navyOnOrange, 192, "icon-192.png"),
  await anyIcon(navyOnOrange, 512, "icon-512.png"),
  await fullBleedIcon(navyOnOrange, 192, "icon-maskable-192.png", RATIO.maskable),
  await fullBleedIcon(navyOnOrange, 512, "icon-maskable-512.png", RATIO.maskable),
  await fullBleedIcon(navyOnOrange, 180, "apple-touch-icon.png", RATIO.apple),
  await badgeIcon(96, "badge-96.png"),
]
const splashCount = await splashScreens(orangeOnNavy)

console.log("Wrote public/icons/:\n  " + written.join("\n  "))
console.log(`Wrote ${splashCount} launch screens to public/splash/ and lib/pwa/apple-splash.generated.ts`)
