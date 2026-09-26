"use client"

/**
 * Full-page skeleton for auth check, dashboard, settings, and other generic pages.
 * Use instead of spinner + "Loading..." text.
 */
export default function PageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-page" aria-busy="true" aria-label="Loading">
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8 md:px-6">
        <div className="h-3 w-20 rounded-full bg-up-fill" />
        <div className="h-7 w-56 max-w-full rounded-full bg-up-fill" />
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-up-xl border border-border bg-card p-5 motion-reduce:animate-none">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="h-[34px] w-[34px] rounded-up-sm bg-up-fill" />
                <div className="h-3 w-28 rounded-full bg-up-fill" />
              </div>
              <div className="mb-2.5 h-3.5 w-full rounded-full bg-up-hairline" />
              <div className="h-3.5 w-4/5 rounded-full bg-up-hairline" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
