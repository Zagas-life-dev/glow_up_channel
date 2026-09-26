"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

/** The app's top-bar colour in each theme (--up-bar-bg, made opaque). */
const BAR = { light: "#FBFAF7", dark: "#070A1C" } as const

/**
 * Keeps the browser chrome (status bar, installed title bar) on the reader's
 * chosen theme.
 *
 * app/layout.tsx emits one theme-color per `prefers-color-scheme`, which is
 * right for anyone on "system" and is there before any script runs. Someone who
 * picked dark by hand on a light-mode phone would still get the light bar,
 * though, because the media query follows the OS, not the app. So once the
 * theme is known, a manual choice overwrites both tags with its colour, and
 * returning to "system" puts the originals back.
 */
export default function ThemeColorSync() {
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    tags.forEach((tag) => {
      if (tag.dataset.original === undefined) tag.dataset.original = tag.content
      if (theme === "system" || !resolvedTheme) {
        tag.content = tag.dataset.original
      } else {
        tag.content = resolvedTheme === "dark" ? BAR.dark : BAR.light
      }
    })
  }, [theme, resolvedTheme])

  return null
}
