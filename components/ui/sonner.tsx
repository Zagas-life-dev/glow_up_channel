"use client"

import { Check, Info, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/** The small status dot at the start of a toast: lime done, orange info, red only for failure. */
function Dot({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${className}`} aria-hidden>
      {children}
    </span>
  )
}

/**
 * One toast shape everywhere: a navy pill (cream in dark), bottom-centre,
 * lifted above the phone bottom nav, one at a time on phones.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      visibleToasts={3}
      offset={24}
      mobileOffset={{ bottom: "calc(84px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
      icons={{
        success: (
          <Dot className="bg-up-lime text-up-navy">
            <Check className="h-4 w-4" strokeWidth={3} />
          </Dot>
        ),
        info: (
          <Dot className="bg-up-orange text-up-navy">
            <Info className="h-4 w-4" strokeWidth={2.5} />
          </Dot>
        ),
        warning: (
          <Dot className="bg-up-orange text-up-navy">
            <Info className="h-4 w-4" strokeWidth={2.5} />
          </Dot>
        ),
        error: (
          <Dot className="bg-destructive text-white">
            <X className="h-4 w-4" strokeWidth={3} />
          </Dot>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans group-[.toaster]:w-max group-[.toaster]:max-w-full group-[.toaster]:gap-3 group-[.toaster]:rounded-[22px] group-[.toaster]:border-0 group-[.toaster]:bg-up-solid group-[.toaster]:py-2 group-[.toaster]:pl-3 group-[.toaster]:pr-2 group-[.toaster]:text-up-on-solid group-[.toaster]:shadow-[0_12px_30px_rgba(11,18,51,0.3)]",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-xs group-[.toast]:opacity-70",
          icon: "group-[.toast]:m-0 group-[.toast]:h-7 group-[.toast]:w-7",
          actionButton:
            "group-[.toast]:!ml-1.5 group-[.toast]:!h-auto group-[.toast]:!rounded-full group-[.toast]:!bg-white/10 group-[.toast]:!px-3 group-[.toast]:!py-1.5 group-[.toast]:!text-[13px] group-[.toast]:!font-bold group-[.toast]:!text-up-orange dark:group-[.toast]:!bg-[rgba(11,18,51,0.06)] dark:group-[.toast]:!text-[#B8551E]",
          cancelButton:
            "group-[.toast]:!rounded-full group-[.toast]:!bg-transparent group-[.toast]:!text-[13px] group-[.toast]:!font-semibold group-[.toast]:!text-up-on-solid group-[.toast]:!opacity-70",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
