"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
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
        "rounded-up-xl border bg-card",
        emphasized
          ? "border-up-orange shadow-[0_0_0_3px_var(--up-orange-tint)]"
          : "border-border",
        className
      )}
      {...props}
    >
      {headerPresent && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-[22px] py-3 sm:py-4 border-b border-up-hairline">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-[34px] h-[34px] rounded-up-sm bg-up-fill text-foreground flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="space-y-0.5 min-w-0">
              {title && (
                <h2 className="text-base font-bold text-foreground truncate">
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
      <div className={cn("px-4 sm:px-[22px] py-4 sm:py-5", !headerPresent && "pt-4")}>
        {children}
      </div>
    </div>
  );
}

