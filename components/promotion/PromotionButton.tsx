"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { RiStarLine } from "react-icons/ri"

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
          className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-foreground text-xs px-2 py-1 z-10 animate-pulse"
        >
          <RiStarLine className="h-3 w-3 mr-1" />
          Boost
        </Badge>
      )}
      <Button
        onClick={onClick}
        variant={variant}
        size={size}
        className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
      >
        <FlaticonIcon name="trending-up" className="h-4 w-4 mr-2" aria-hidden />
        Promote Content
        <FlaticonIcon name="bolt" className="h-4 w-4 ml-2" aria-hidden />
      </Button>
    </div>
  )
}




