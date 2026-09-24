import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { IMAGE_TARGETS, prepareImageUpload, targetScale } from "@/lib/images/compress-image"

const MB = 1024 * 1024
const fileOf = (type: string, bytes: number, name = "x") =>
  new File([new Uint8Array(bytes)], name, { type })

describe("targetScale", () => {
  it("cover keeps the short edge at the box, so the server's crop still fills it", () => {
    // 4000x3000 photo into a 1200 square: short edge 3000 -> 1200.
    expect(targetScale(4000, 3000, IMAGE_TARGETS.playlistCover)).toBeCloseTo(0.4)
  })

  it("contain fits the long edge inside the box", () => {
    expect(targetScale(5120, 1000, IMAGE_TARGETS.resourceImage)).toBeCloseTo(0.5)
  })

  it("never upscales", () => {
    expect(targetScale(300, 300, IMAGE_TARGETS.playlistCover)).toBe(1)
    expect(targetScale(100, 80, IMAGE_TARGETS.profilePicture)).toBe(1)
  })
})

describe("prepareImageUpload pass-through", () => {
  it("leaves documents alone", async () => {
    const pdf = fileOf("application/pdf", 20 * MB, "doc.pdf")
    const out = await prepareImageUpload(pdf, IMAGE_TARGETS.resourceImage)
    expect(out).toEqual({ ok: true, file: pdf, compressedFrom: null })
  })

  it("leaves SVG logos alone", async () => {
    const svg = fileOf("image/svg+xml", 2000, "logo.svg")
    const out = await prepareImageUpload(svg, IMAGE_TARGETS.organizationLogo)
    expect(out.ok && out.file).toBe(svg)
  })

  it("never re-encodes a GIF: accepted under the cap, refused as animated over it", async () => {
    const small = fileOf("image/gif", 2 * MB)
    expect(await prepareImageUpload(small, IMAGE_TARGETS.playlistCover)).toEqual({ ok: true, file: small, compressedFrom: null })
    const big = fileOf("image/gif", 11 * MB)
    expect(await prepareImageUpload(big, IMAGE_TARGETS.playlistCover)).toEqual({ ok: false, animated: true })
  })
})

/**
 * The targets mirror the server's Cloudinary transformations. If someone changes
 * a size on one side only, uploads silently arrive too small (blurry) or too big
 * (slow) — so the two are pinned together here.
 */
describe("targets match the server", () => {
  const cloudinary = readFileSync(join(process.cwd(), "latest-glowup-channel/src/config/cloudinary.js"), "utf8")

  const serverBox = (storage: string) => {
    const block = cloudinary.slice(cloudinary.indexOf(`const ${storage}`))
    const m = block.match(/width: (\d+),\s*height: (\d+)/)
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null
  }

  it.each([
    ["heroImageStorage", IMAGE_TARGETS.promotionHero],
    ["profilePictureStorage", IMAGE_TARGETS.profilePicture],
    ["organizationLogoStorage", IMAGE_TARGETS.organizationLogo],
    ["verificationDocumentStorage", IMAGE_TARGETS.verificationDocument],
    ["uploadPlaylistCover", IMAGE_TARGETS.playlistCover],
  ])("%s", (storage, target) => {
    expect(serverBox(storage)).toEqual({ width: target.width, height: target.height })
  })
})
