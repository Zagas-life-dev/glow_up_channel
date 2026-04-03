"use client"

import { cn } from "@/lib/utils"

type ChannelsSurfaceProps = {
  children: React.ReactNode
  className?: string
  /** Subtle grain + warm primary glow */
  withAtmosphere?: boolean
}

export function ChannelsSurface({ children, className, withAtmosphere }: ChannelsSurfaceProps) {
  return (
    <div className={cn("font-sans", className)}>
      {withAtmosphere ? (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-28 right-0 h-80 w-80 rounded-full opacity-[0.11] dark:opacity-[0.16] blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 72%)" }}
          />
          <div
            className="absolute left-0 top-1/3 h-64 w-64 -translate-x-1/4 rounded-full opacity-[0.05] blur-3xl dark:opacity-[0.09]"
            style={{ background: "radial-gradient(circle, hsl(222 41% 38%) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.32] dark:opacity-[0.18]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.48'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
      ) : null}
      {children}
    </div>
  )
}
