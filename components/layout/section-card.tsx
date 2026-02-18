"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** When true, applies stronger border and background (for primary sections). */
  emphasized?: boolean;
}

export function SectionCard({
  title,
  description,
  icon,
  actions,
  emphasized = false,
  className,
  children,
  ...props
}: SectionCardProps) {
  const headerPresent = title || description || icon || actions;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card",
        emphasized
          ? "border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5"
          : "border-border",
        className
      )}
      {...props}
    >
      {headerPresent && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="space-y-0.5 min-w-0">
              {title && (
                <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-muted-foreground truncate">
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
      )}
      <div className={cn("px-4 sm:px-5 py-4", !headerPresent && "pt-4")}>
        {children}
      </div>
    </div>
  );
}

