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
    <div className="relative w-full max-w-md mx-auto">
      <FlaticonIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" aria-hidden />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        className="w-full pl-12 pr-4 py-3 text-base bg-muted backdrop-blur-sm border-border rounded-full focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 focus:bg-muted transition-all text-foreground placeholder:text-muted-foreground"
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  )
} 