'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ApiClient from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface WalletTopUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function WalletTopUpModal({
  open,
  onOpenChange,
  onCompleted,
}: WalletTopUpModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleClose = () => {
    if (loading) return
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (loading) return

    const parsed = Math.round(Number(amount))
    const min = 500
    const max = 1_000_000
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      toast.error(`Enter an amount between ${min.toLocaleString()} and ${max.toLocaleString()} NGN`)
      return
    }

    if (!user) {
      toast.error("You need to be signed in as a provider to top up your wallet")
      return
    }

    setLoading(true)
    try {
      const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (!key) {
        toast.error("Paystack public key is not configured")
        setLoading(false)
        return
      }

      const { default: PaystackPop } = await import("@paystack/inline-js")
      const paystack = new PaystackPop()

      paystack.newTransaction({
        key,
        email: user.email,
        amount: parsed * 100,
        metadata: {
          type: "wallet_topup",
          providerId: user._id,
        },
        onSuccess: async (tx: { reference: string }) => {
          try {
            const result = await ApiClient.verifyWalletTopUp(tx.reference)
            toast.success("Wallet topped up successfully")
            setAmount("")
            onCompleted?.()
            onOpenChange(false)
          } catch (error: any) {
            console.error("Error verifying wallet top-up:", error)
            toast.error(error?.message || "Failed to verify wallet top-up")
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {
          setLoading(false)
        },
      })
    } catch (e: any) {
      console.error("Wallet top-up error:", e)
      toast.error(e?.message || "Top-up failed")
      setLoading(false)
    }
  }

  const presets = [1000, 5000, 10000, 25000, 50000]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top up promotion wallet</DialogTitle>
          <DialogDescription>
            Add funds to your wallet to pay for promoted clicks. Payment is processed securely via Paystack.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Amount (NGN)</Label>
            <Input
              type="number"
              min={500}
              max={1000000}
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Min 500 — Max 1,000,000 NGN</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((n) => (
              <Button
                key={n}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(n))}
              >
                {n >= 1000 ? `${n / 1000}K` : n} NGN
              </Button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Connecting to Paystack..." : "Pay with Paystack"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

