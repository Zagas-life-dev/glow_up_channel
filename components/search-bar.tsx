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
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        className="w-full pl-12 pr-4 py-3 text-lg bg-white/90 backdrop-blur-sm border-gray-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-800 placeholder:text-gray-500"
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  )
} 