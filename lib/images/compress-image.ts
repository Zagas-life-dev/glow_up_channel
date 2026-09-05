/**
 * Client-side image compression for cover art.
 *
 * Cover uploads are capped at 10MB by the backend, and a photo straight off a
 * phone or a DSLR routinely clears that. Rejecting those outright pushes the
 * work onto the user — find an image editor, resize, come back — when the
 * browser can do it in a second, and the server downscales the result to
 * 1920x1080 anyway. So an oversized cover is re-encoded here before it is ever
 * put on the wire, which also saves uploading megabytes that were going to be
 * thrown away.
 *
 * Compression is bounded on purpose. Below the last rung of the ladder the
 * result stops being a usable cover, so instead of quietly shipping a mushy
 * image the caller is told the file is simply too large. That is the "too
 * extreme" line: we would rather ask for a smaller original than hand back
 * something that looks broken.
 */

/** The backend's own ceiling for cover/hero uploads. */
export const MAX_COVER_BYTES = 10 * 1024 * 1024

/**
 * Quality/size rungs, mildest first; the first result that fits wins.
 *
 * The last rung is the floor — 1600px on the long edge at 55% quality still
 * prints cleanly at the 1920x1080 the server renders to. Anything that cannot
 * fit inside 10MB at that setting is not a photo we can rescue.
 */
const ATTEMPTS = [
  { maxEdge: 2560, quality: 0.85 },
  { maxEdge: 2560, quality: 0.72 },
  { maxEdge: 2048, quality: 0.72 },
  { maxEdge: 1920, quality: 0.65 },
  { maxEdge: 1600, quality: 0.55 },
] as const

export type CompressOutcome =
  /** Ready to upload. `compressedFrom` is null when the original already fit. */
  | { ok: true; file: File; compressedFrom: number | null }
  /**
   * Not usable. `animated` distinguishes a GIF — which we refuse to re-encode
   * rather than silently flatten to a still — from an image that stayed over
   * the limit even at the floor.
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

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
}

/** Swap the extension for .jpg, since re-encoding always produces a JPEG. */
function jpegName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "cover"}.jpg`
}

/**
 * Bring an image under `maxBytes`, or report that it cannot be done.
 *
 * Files already under the limit are returned untouched — no needless re-encode,
 * so a small PNG keeps its transparency and its exact bytes.
 */
export async function compressImage(file: File, maxBytes: number = MAX_COVER_BYTES): Promise<CompressOutcome> {
  if (file.size <= maxBytes) return { ok: true, file, compressedFrom: null }

  // An oversized GIF is almost certainly animated, and a canvas re-encode would
  // keep only the first frame. Losing the animation without saying so would be
  // worse than asking for a smaller file.
  if (file.type === "image/gif") return { ok: false, animated: true }

  let decoded
  try {
    decoded = await decode(file)
  } catch {
    // Undecodable at this size usually means the browser refused to allocate
    // it, which is the same answer for the user either way.
    return { ok: false, animated: false }
  }

  try {
    const { width, height, source } = decoded
    if (!width || !height) return { ok: false, animated: false }

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return { ok: false, animated: false }

    for (const { maxEdge, quality } of ATTEMPTS) {
      // Never upscale: a long-but-heavy image (a huge PNG screenshot) is
      // compressed by quality alone rather than being stretched.
      const scale = Math.min(1, maxEdge / Math.max(width, height))
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))

      // JPEG has no alpha; without a white ground, transparent PNG areas encode
      // as black. Covers are photographic, so white is the safer assumption.
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(source, 0, 0, canvas.width, canvas.height)

      const blob = await toBlob(canvas, quality)
      if (blob && blob.size <= maxBytes) {
        return {
          ok: true,
          file: new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() }),
          compressedFrom: file.size,
        }
      }
    }

    // Still over the limit at the floor — compressing further would ruin it.
    return { ok: false, animated: false }
  } finally {
    decoded.release()
  }
}

/** "12.4MB" — for telling someone how big the file they picked actually is. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}
