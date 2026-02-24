'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard'
import { WalletTopUpModal } from '@/components/wallet/WalletTopUpModal'
import { cn } from '@/lib/utils'
import { AlertCircle, ArrowLeft, DollarSign } from 'lucide-react'

export default function ProviderWalletPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balanceNg, setBalanceNg] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      setLoading(false)
    }
  }, [authLoading, user])

  const loadWallet = async () => {
    try {
      setWalletLoading(true)
      const [wallet, tx] = await Promise.all([
        ApiClient.getWallet(),
        ApiClient.getWalletTransactions(50),
      ])
      setBalanceNg(wallet.balanceNg ?? 0)
      setTransactions(tx.transactions ?? [])
    } catch (err: any) {
      console.error('Error loading wallet:', err)
      setError('Failed to load wallet data')
    } finally {
      setWalletLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && (user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin')) {
      loadWallet()
    }
  }, [authLoading, user])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#020817] via-[#020817] to-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#020817] via-[#020817] to-black px-4">
        <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
              <p className="text-xs text-muted-foreground">Please sign in to view your wallet.</p>
            </div>
          </div>
          <Button asChild className="w-full rounded-xl bg-primary hover:bg-primary/90">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#020817] via-[#020817] to-black px-4">
        <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center border border-orange-500/30">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Provider wallet only</h2>
              <p className="text-xs text-muted-foreground">
                You need a provider account to access the wallet.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              onClick={() => router.push('/dashboard')}
            >
              Back to dashboard
            </Button>
            <Button
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
              onClick={() => router.push('/profile/settings')}
            >
              Upgrade account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#020817] via-[#020817] to-black overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(147,51,234,0.16),_transparent_55%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border/60 bg-card/60 hover:bg-card/80"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Wallet</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your promotion balance and track spend.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6">
            <WalletBalanceCard
              balanceNg={balanceNg}
              onTopUpClick={() => setShowTopUpModal(true)}
            />

            <Card className="border border-border bg-card/90 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-foreground">
                  <DollarSign className="h-4 w-4 text-orange-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                {walletLoading ? (
                  <div className="py-6 text-sm text-muted-foreground">
                    Loading wallet activity...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-6 text-sm text-muted-foreground">
                    No wallet transactions yet. Use Top up to add funds, then your spend will show here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={String(tx._id)}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border/80"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                            {tx.type === 'topup' ? 'Top-up' : 'Click deduction'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {tx.contentType ? `Content: ${tx.contentType}` : tx.reference || 'Wallet activity'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              tx.type === 'topup' ? 'text-emerald-400' : 'text-red-400',
                            )}
                          >
                            {new Intl.NumberFormat('en-NG', {
                              style: 'currency',
                              currency: 'NGN',
                              minimumFractionDigits: 0,
                            }).format(Math.abs(tx.amount || tx.costNg || 0))}
                          </span>
                          <div className="text-[11px] text-muted-foreground">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <Card className="border border-border bg-card/90 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4">
                <CardTitle className="text-sm sm:text-base text-foreground">
                  How your wallet works
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3 text-xs sm:text-sm text-muted-foreground">
                <p>
                  Your wallet is a shared balance used to fund promotions across opportunities, jobs,
                  events, and resources.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Top up any amount (500–1,000,000 NGN) via Paystack.</li>
                  <li>
                    Each valid promoted click deducts from your balance based on match quality and
                    click rules.
                  </li>
                  <li>
                    When your balance runs low, promotions may pause until you top up again.
                  </li>
                </ul>
                <p className="pt-1">
                  You can manage specific promotions and see per-content performance on the{' '}
                  <Link href="/dashboard/provider/promotions" className="text-primary underline underline-offset-2">
                    Promotions
                  </Link>{' '}
                  page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <WalletTopUpModal
        open={showTopUpModal}
        onOpenChange={setShowTopUpModal}
        onCompleted={loadWallet}
      />
    </div>
  )
}

