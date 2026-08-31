import { redirect } from 'next/navigation'

/**
 * The provider wallet is gone.
 *
 * It existed only to fund promotions, and promotion is now free: nothing is
 * charged upfront, per click, or as a posting fee. The route is kept as a
 * redirect so old links and bookmarks land somewhere useful instead of 404ing.
 */
export default function ProviderWalletPage() {
  redirect('/dashboard/provider/promotions')
}
