/**
 * Client-side image preparation for every image upload.
 *
 * Each upload endpoint keeps images at a known size — a 400px square profile
 * picture, a 1200px square playlist cover, a 1920x1080 hero — and caps what it
 * will accept in bytes. Sending a 9MB phone photo so the server can shrink it to
 * a 60KB thumbnail wastes the reader's data and makes every upload feel slow, and
 * a photo over the cap was rejected outright. So images are brought to the size
 * the server will keep, here, before they go on the wire.
 *
 * Every endpoint has a named target in `IMAGE_TARGETS` that mirrors its server
 * config (`latest-glowup-channel/src/config/cloudinary.js`). Change one side and
 * change the other.
 *
 * Three rules keep this from doing harm:
 *
 *   - **Never upscale**, and leave a file alone when it is already an efficient
 *     format at or under the target size — no needless re-encode.
 *   - **Animated GIFs are never re-encoded.** A canvas keeps only the first frame,
 *     and silently losing the animation is worse than asking for a smaller file.
 *   - **Compression is bounded.** Below the last rung of the ladder the image stops
 *     being usable, so instead of shipping something mushy the caller is told the
 *     file is too large.
 */

/** How the server fits the image into its box. */
type Fit =
  /** Server crops to fill the box, so the image only needs to cover it. */
  | "cover"
  /** Server keeps the whole image, so it only needs to fit inside the box. */
  | "contain"

export type ImageTarget = {
  width: number
  height: number
  fit: Fit
  /** The endpoint's own byte ceiling. */
  maxBytes: number
  /**
   * Keep transparency by encoding WebP instead of JPEG — for logos, where a white
   * box behind a transparent mark would be visibly wrong. Photos use JPEG.
   */
  keepAlpha?: boolean
}

const MB = 1024 * 1024

/**
 * One target per upload endpoint, mirroring the server's transformation.
 * `resourceImage` and `giftCover` are stored at original size, so they get a
 * generous cap rather than a crop — they are downloadable files people read.
 */
export const IMAGE_TARGETS = {
  playlistCover: { width: 1200, height: 1200, fit: "cover", maxBytes: 10 * MB },
  promotionHero: { width: 1920, height: 1080, fit: "cover", maxBytes: 10 * MB },
  profilePicture: { width: 400, height: 400, fit: "cover", maxBytes: 5 * MB },
  organizationLogo: { width: 400, height: 400, fit: "cover", maxBytes: 5 * MB, keepAlpha: true },
  verificationDocument: { width: 1200, height: 800, fit: "cover", maxBytes: 10 * MB },
  resourceImage: { width: 2560, height: 2560, fit: "contain", maxBytes: 25 * MB },
  giftCover: { width: 1920, height: 1920, fit: "contain", maxBytes: 10 * MB },
} as const satisfies Record<string, ImageTarget>

/** The backend's ceiling for cover/hero uploads. Kept for existing callers. */
export const MAX_COVER_BYTES = 10 * MB

/**
 * Encode settings, tried in order; the first result under the byte cap wins.
 * `scale` shrinks below the target size only when quality alone cannot get under
 * the cap. The last rung is the floor.
 */
const LADDER = [
  { scale: 1, quality: 0.85 },
  { scale: 1, quality: 0.75 },
  { scale: 0.85, quality: 0.7 },
  { scale: 0.7, quality: 0.62 },
] as const

/** Formats that are already compressed well; left alone when small enough. */
const EFFICIENT_TYPES = new Set(["image/jpeg", "image/jpg", "image/webp", "image/avif"])

export type CompressOutcome =
  /** Ready to upload. `compressedFrom` is the original size, or null when untouched. */
  | { ok: true; file: File; compressedFrom: number | null }
  /**
   * Not usable. `animated` distinguishes a GIF — which we refuse to re-encode —
   * from an image that stayed over the limit even at the floor.
   */
  | { ok: false; animated: boolean }

/** Decode to a bitmap, preferring the fast path but falling back for older Safari. */
async function decode(file: File): Promise<{ width: number; height: number; source: CanvasImageSource; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file)
    return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Image could not be decoded"))
      el.src = url
    })
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/**
 * The scale that brings an image to the target, never above 1.
 *
 * `cover`: the server crops to fill the box, so the image must still cover it —
 * scale by the larger ratio. `contain`: the whole image is kept, so it must fit
 * inside — scale by the smaller one.
 */
export function targetScale(width: number, height: number, target: Pick<ImageTarget, "width" | "height" | "fit">): number {
  if (!width || !height) return 1
  const rw = target.width / width
  const rh = target.height / height
  return Math.min(1, target.fit === "cover" ? Math.max(rw, rh) : Math.min(rw, rh))
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function renamed(name: string, type: string): string {
  const ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg"
  return `${name.replace(/\.[^.]+$/, "") || "image"}.${ext}`
}

/**
 * Bring an image to what its endpoint will keep, or report that it cannot be done.
 *
 * Non-images and SVGs are returned untouched — they are not this pipeline's to
 * change, and the caller's own validation decides whether they are accepted.
 */
export async function prepareImageUpload(file: File, target: ImageTarget): Promise<CompressOutcome> {
  const untouched: CompressOutcome = { ok: true, file, compressedFrom: null }
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return untouched

  if (file.type === "image/gif") {
    return file.size <= target.maxBytes ? untouched : { ok: false, animated: true }
  }

  let decoded
  try {
    decoded = await decode(file)
  } catch {
    // A format this browser cannot decode (HEIC on desktop Chrome, say) is left
    // for the server to judge if it fits; if it does not, there is nothing we can do.
    return file.size <= target.maxBytes ? untouched : { ok: false, animated: false }
  }

  try {
    const { width, height, source } = decoded
    if (!width || !height) return { ok: false, animated: false }

    const scale = targetScale(width, height, target)
    // Already the right size, in a format that is already compressed, and under
    // the cap: re-encoding would only cost quality.
    if (scale === 1 && file.size <= target.maxBytes && EFFICIENT_TYPES.has(file.type)) return untouched

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return file.size <= target.maxBytes ? untouched : { ok: false, animated: false }

    const wantType = target.keepAlpha ? "image/webp" : "image/jpeg"

    for (const rung of LADDER) {
      const s = scale * rung.scale
      canvas.width = Math.max(1, Math.round(width * s))
      canvas.height = Math.max(1, Math.round(height * s))
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (!target.keepAlpha) {
        // JPEG has no alpha; without a white ground, transparent areas encode as black.
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.imageSmoothingQuality = "high"
      context.drawImage(source, 0, 0, canvas.width, canvas.height)

      let blob = await toBlob(canvas, wantType, rung.quality)
      // Older Safari cannot encode WebP and hands back a PNG instead; that still
      // keeps transparency, just larger.
      if (blob && target.keepAlpha && blob.type !== "image/webp") {
        blob = await toBlob(canvas, "image/png", 1)
      }
      if (!blob || blob.size > target.maxBytes) continue

      // A small original that needed no resize can come out *bigger* when
      // re-encoded (a flat-colour PNG, say). Keep whichever is smaller.
      if (scale === 1 && file.size <= target.maxBytes && blob.size >= file.size) return untouched

      return {
        ok: true,
        file: new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: Date.now() }),
        compressedFrom: file.size,
      }
    }

    // Still over the limit at the floor — compressing further would ruin it.
    return { ok: false, animated: false }
  } finally {
    decoded.release()
  }
}

/**
 * Legacy entry point: bring an image under `maxBytes` with a generous size cap.
 * New code should call `prepareImageUpload` with the endpoint's `IMAGE_TARGETS` entry.
 */
export function compressImage(file: File, maxBytes: number = MAX_COVER_BYTES): Promise<CompressOutcome> {
  return prepareImageUpload(file, { width: 2560, height: 2560, fit: "contain", maxBytes })
}

/** The message to show when `prepareImageUpload` says no. */
export function prepareErrorMessage(outcome: Extract<CompressOutcome, { ok: false }>, file: File, target: ImageTarget): string {
  const limit = formatBytes(target.maxBytes)
  return outcome.animated
    ? `That GIF is ${formatBytes(file.size)}. Animated GIFs can't be compressed without losing the animation — please use one under ${limit}.`
    : `That image is ${formatBytes(file.size)} and can't be brought under ${limit} without ruining it. Please try a smaller one.`
}

/** "12.4MB" — for telling someone how big the file they picked actually is. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}
