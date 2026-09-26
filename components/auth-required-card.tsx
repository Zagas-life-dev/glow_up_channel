"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

/** Icon component that accepts className (Lucide or react-icons). */

type IconComponent = React.ComponentType<any>;
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AuthRequiredCardProps {
  title?: string;
  description?: string;
  icon?: IconComponent;
  iconVariant?: "neutral" | "accent";
  showSignUp?: boolean;
  showBenefits?: boolean;
  signInLabel?: string;
  className?: string;
  cardClassName?: string;
  secondaryAction?: { label: string; href: string };
  children?: React.ReactNode;
}

const DEFAULT_TITLE = "Sign in to continue";

/**
 * The sign-in wall: a navy card with the tile stack, not a full grey page. It
 * says what the page is for (the caller's title/description), then one orange
 * action.
 */
export function AuthRequiredCard({
  title = DEFAULT_TITLE,
  description,
  icon: Icon = Lock,
  iconVariant = "accent",
  showSignUp = false,
  signInLabel = "Sign in",
  className,
  cardClassName,
  secondaryAction,
  children,
}: AuthRequiredCardProps) {
  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-page px-4 py-10", className)}>
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-up-xl bg-up-navy px-6 pb-7 pt-7 text-up-on-navy shadow-up-pop dark:bg-up-lead sm:px-8",
          cardClassName,
        )}
      >
        <span aria-hidden className="absolute -right-10 -top-12 h-[140px] w-[190px] -rotate-[8deg] rounded-[24px] bg-up-orange" />
        <span aria-hidden className="absolute -top-6 right-14 h-[76px] w-[100px] rotate-[7deg] rounded-[18px] bg-up-lime" />

        <div className="relative">
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-up-md bg-up-navy-subtle",
              iconVariant === "accent" ? "text-up-orange" : "text-up-on-navy-muted",
            )}
          >
            <Icon className="h-[22px] w-[22px]" aria-hidden />
          </span>
          <h1 className="mt-4 max-w-[62%] font-display text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-relaxed text-up-orange">{description}</p> : null}
          {children}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            {showSignUp ? (
              <>
                <Button asChild className="h-11 px-6">
                  <Link href="/signup">Create account</Link>
                </Button>
                <p className="text-[13px] text-up-on-navy-muted">
                  Have one?{" "}
                  <Link href="/login" className="font-bold text-up-on-navy hover:underline">
                    {signInLabel}
                  </Link>
                </p>
              </>
            ) : (
              <>
                <Button asChild className="h-11 px-6">
                  <Link href="/login">{signInLabel}</Link>
                </Button>
                {secondaryAction && (
                  <Link href={secondaryAction.href} className="text-[13px] font-bold text-up-on-navy-muted hover:text-up-on-navy">
                    {secondaryAction.label}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
