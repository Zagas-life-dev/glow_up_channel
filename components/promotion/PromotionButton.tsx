"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Star, Zap } from "lucide-react"

interface PromotionButtonProps {
  onClick: () => void
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showBadge?: boolean
}

export default function PromotionButton({ 
  onClick, 
  variant = "default", 
  size = "default",
  className = "",
  showBadge = true
}: PromotionButtonProps) {
  return (
    <div className="relative">
      {showBadge && (
        <Badge 
          className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 z-10 animate-pulse"
        >
          <Star className="h-3 w-3 mr-1" />
          Boost
        </Badge>
      )}
      <Button
        onClick={onClick}
        variant={variant}
        size={size}
        className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Promote Content
        <Zap className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}




