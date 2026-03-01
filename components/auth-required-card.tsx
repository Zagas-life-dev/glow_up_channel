"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, UserPlus, LogIn } from "lucide-react";

/** Icon component that accepts className (Lucide or react-icons). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const DEFAULT_TITLE = "Authentication required";

const primaryButtonClass =
  "w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full shadow-md shadow-orange-500/20 transition-all duration-200";

const formCardClass =
  "w-full border border-border/70 bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl";

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
    <div
      className={cn(
        "min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden",
        className
      )}
    >
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-rose-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className={cn("relative w-full max-w-md", formCardClass, cardClassName)}>
        <div className="p-6 sm:p-8 text-center">
          <div
            className={cn(
              "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 border",
              iconVariant === "accent"
                ? "bg-card/60 border-border/70 text-orange-400"
                : "bg-muted/80 border-border/60 text-muted-foreground"
            )}
          >
            <Icon className="w-7 h-7" aria-hidden />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground mb-6">{description}</p>
          ) : null}
          {children}
          <div className="space-y-3">
            {showSignUp ? (
              <>
                <Button asChild size="lg" className={primaryButtonClass}>
                  <Link href="/signup">
                    <UserPlus className="w-4 h-4 mr-2" aria-hidden />
                    Create account
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                  >
                    {signInLabel}
                  </Link>
                </p>
              </>
            ) : (
              <>
                <Button asChild size="lg" className={primaryButtonClass}>
                  <Link href="/login">
                    <LogIn className="w-4 h-4 mr-2" aria-hidden />
                    {signInLabel}
                  </Link>
                </Button>
                {secondaryAction && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50 h-11"
                  >
                    <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
