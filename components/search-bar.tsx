'use client'

import { Input } from "@/components/ui/input"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"

interface SearchBarProps {
  value: string
  onValueChange: (query: string) => void
  placeholder: string
}

export default function SearchBar({ value, onValueChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <FlaticonIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" aria-hidden />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        className="h-12 w-full rounded-full border-[1.5px] border-border bg-card pl-12 pr-5 text-base text-foreground shadow-[0_1px_0_rgba(11,18,51,0.03)] transition-all placeholder:text-muted-foreground focus-visible:border-up-orange focus-visible:ring-4 focus-visible:ring-up-orange-tint focus-visible:ring-offset-0"
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  )
} 