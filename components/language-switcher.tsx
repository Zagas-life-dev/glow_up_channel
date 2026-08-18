"use client"

/**
 * Language picker.
 *
 * Language names are always shown in their own language — someone looking for
 * Portuguese is looking for the word "Português", not "Portuguese", which they
 * may not recognise in a UI they cannot currently read.
 */

import * as React from "react"
import { Check, ChevronDown, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({
  className,
  variant = "ghost",
  showLabel = true,
}: {
  className?: string
  variant?: "ghost" | "outline"
  showLabel?: boolean
}) {
  const { locale, setLocale, available, labels, t } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn("rounded-xl gap-2", className)}
          aria-label={t("language.switch")}
        >
          <Globe className="h-4 w-4" aria-hidden />
          {showLabel && <span className="text-sm">{labels[locale]}</span>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {available.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => setLocale(option)}
            className="flex items-center justify-between gap-3"
            // The menu is multilingual by definition — tell assistive tech
            // which language each row is actually in.
            lang={option}
          >
            <span>{labels[option]}</span>
            {option === locale && (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
