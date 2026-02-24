'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DollarSign, CreditCard } from "lucide-react"

interface WalletBalanceCardProps {
  balanceNg: number
  onTopUpClick: () => void
  onViewFullWalletClick?: () => void
  className?: string
}

export function WalletBalanceCard({
  balanceNg,
  onTopUpClick,
  onViewFullWalletClick,
  className,
}: WalletBalanceCardProps) {
  const formatted = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(balanceNg || 0)

  return (
    <Card className={cn("border-0 shadow-lg", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Promotion wallet</p>
            <p className="text-2xl font-bold text-foreground">{formatted}</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onTopUpClick}
          >
            <CreditCard className="h-4 w-4 mr-1.5" />
            Top up wallet
          </Button>
          {onViewFullWalletClick && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={onViewFullWalletClick}
            >
              View full wallet
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

