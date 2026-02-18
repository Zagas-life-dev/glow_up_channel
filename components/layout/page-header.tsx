"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional leading icon or badge element. */
  icon?: React.ReactNode;
  /** When true, uses a soft gradient background similar to dashboard hero. */
  variant?: "default" | "gradient";
  /** Optional right-aligned actions (buttons, links, etc.). */
  actions?: React.ReactNode;
  /** Make header sticky at top (used for feeds and index pages). */
  sticky?: boolean;
}

export function PageHeader({
  title,
  description,
  icon,
  variant = "default",
  actions,
  sticky = false,
  className,
  ...props
}: PageHeaderProps) {
  const base = (
    <div
      className={cn(
        "flex items-start justify-between gap-4",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-orange-500/20 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );

  const wrapped =
    variant === "gradient" ? (
      <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-orange-600/10 px-4 sm:px-6 py-4 sm:py-5">
        {base}
      </div>
    ) : (
      base
    );

  if (!sticky) {
    return wrapped;
  }

  return (
    <div className="sticky top-0 z-30 bg-page/95 backdrop-blur-xl border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-3">
      {wrapped}
    </div>
  );
}

