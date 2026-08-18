/**
 * Flags for work that exists in the codebase but is not being shown yet.
 *
 * A flag here is a *temporary* hold, not a permanent config knob: the feature is
 * built and reachable, we have simply decided not to surface it. Keeping the
 * code in place and gating it beats deleting it — turning something back on
 * should be a one-line change, not an archaeology exercise.
 *
 * Each flag names every place it gates, so re-enabling does not mean grepping
 * for stragglers. If you add a gate, add it to the list.
 */

/**
 * The partner / Founder Batch programme — paid publisher access.
 *
 * Off while the commercial terms are being settled. Everything below is gated
 * on this, and flipping it to `true` restores all of it:
 *
 *   - `app/founder-batch/layout.tsx`      — the page itself; 404s while off, so
 *                                           a shared or bookmarked link cannot
 *                                           reach the pitch or the pay flow
 *   - `app/work-with-us/page.tsx`         — the "Become a partner" choice, the
 *                                           welcome bullet, and the partner
 *                                           screen it routes to
 *   - `app/work-with-us/ui.tsx`           — the "Listing a lot?" footer link
 *                                           carried by every track
 *   - `app/work-with-us/layout.tsx`       — the page metadata description
 *   - `app/profile/settings/page.tsx`     — both "Join Founder Batch" prompts
 *
 * Deliberately *not* gated, because these serve people who already joined:
 *   - the `founder_batch` role in `lib/roles.ts` and the admin user screens —
 *     existing members keep their publishing rights and stay manageable
 *   - the Provider Hub link in settings, which is how members reach their
 *     content once the join prompt beside it is hidden
 *   - `ApiClient`'s founder-batch methods, which the page still needs when on
 *
 * Typed as `boolean` rather than left to literal inference so the disabled
 * branches still typecheck as reachable code and do not rot while it is off.
 */
export const PARTNER_PROGRAMME_ENABLED: boolean = false
