'use client'

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onValueChange: (query: string) => void
  placeholder: string
}

export default function SearchBar({ value, onValueChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 z-10" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        className="w-full pl-12 pr-4 py-3 text-base bg-white/[0.05] backdrop-blur-sm border-white/[0.1] rounded-full focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 focus:bg-white/[0.08] transition-all text-white placeholder:text-white/40"
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  )
} 