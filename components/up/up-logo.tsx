import { cn } from "@/lib/utils"
import { BRAND_LOGOS, brandLogoUrl } from "@/lib/seo/brand"

/**
 * The UP logo mark — the U, the arrow and the P — served from Cloudinary, so
 * every surface and every device draws the same file.
 *
 * `tone` is the colour of the mark itself: navy on the orange tiles, orange on
 * navy surfaces. The mark is transparent around its shape, so the surface it
 * sits on supplies the background.
 *
 * Size it with `className` (a height, or a width inside a tile). `height` is
 * only the resolution requested from Cloudinary — the largest size it will be
 * drawn at, in CSS pixels.
 *
 * `alt` defaults to "UP". Pass `alt=""` where the surrounding link or heading
 * already names the brand, so a screen reader does not say it twice.
 */
export function UpLogo({
  tone,
  height = 32,
  alt = "UP",
  className,
}: {
  tone: "navy" | "orange"
  height?: number
  alt?: string
  className?: string
}) {
  const src = brandLogoUrl(tone === "navy" ? BRAND_LOGOS.markNavy : BRAND_LOGOS.markOrange, { height })
  return (
    // A plain <img>: images.unoptimized is on, and Cloudinary already sizes and
    // formats the file (see brandLogoUrl).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      // The mark's own proportions (1199×701), so the box is reserved before
      // the file arrives and nothing shifts.
      width={Math.round((height * 1199) / 701)}
      height={height}
      decoding="async"
      draggable={false}
      className={cn("block h-auto select-none", className)}
    />
  )
}
