import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function glassSurfaceClass(...inputs: ClassValue[]) {
  return cn(
    "rounded-up-lg border-0 bg-popover text-popover-foreground shadow-up-pop",
    ...inputs
  )
}
