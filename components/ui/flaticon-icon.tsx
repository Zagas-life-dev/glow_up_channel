"use client"

import { cn } from "@/lib/utils"

/**
 * Flaticon Uicons – icon font via CSS classes.
 * Package: @flaticon/flaticon-uicons (CSS is imported in app/globals.css).
 *
 * Styles: fi-sr (solid rounded) and fi-brands. Only those two stylesheets are
 * loaded; to use another style, import its CSS in globals.css and add it here.
 * Use kebab-case icon names, e.g. "home", "arrow-right", "sign-out".
 */
export type FlaticonStyle = "fi-sr" | "fi-brands"

export interface FlaticonIconProps {
  /** Flaticon icon name (kebab-case), e.g. "home", "arrow-right" */
  name: string
  /** Style prefix. Default: "fi-sr" (solid rounded) */
  style?: FlaticonStyle
  className?: string
  /** Accessibility: pass when icon is decorative */
  "aria-hidden"?: boolean
  /** Accessibility: pass when icon conveys meaning */
  "aria-label"?: string
}

export function FlaticonIcon({
  name,
  style = "fi-sr",
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: FlaticonIconProps) {
  const iconClass = style === "fi-brands" ? `fi fi-brands-${name}` : `fi ${style}-${name}`
  return (
    <i
      className={cn(iconClass, className)}
      aria-hidden={ariaHidden ?? !ariaLabel}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    />
  )
}
