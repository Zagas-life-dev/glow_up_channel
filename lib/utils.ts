import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function glassSurfaceClass(...inputs: ClassValue[]) {
  return cn(
    "rounded-xl border border-border/60 bg-popover/80 backdrop-blur-md shadow-lg",
    ...inputs
  )
}
