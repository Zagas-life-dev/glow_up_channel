"use client"

import { useTheme } from "next-themes"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-9 w-9 p-0", className)}
        aria-label="Toggle theme"
      >
        <FlaticonIcon name="sun" className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-accent", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <FlaticonIcon name="sun" className="h-4 w-4" aria-hidden />
      ) : (
        <FlaticonIcon name="moon" className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}
