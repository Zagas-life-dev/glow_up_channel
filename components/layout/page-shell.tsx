"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional max-width container; defaults to a centered column. */
  fullWidth?: boolean;
}

export function PageShell({
  children,
  className,
  fullWidth = false,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-page",
        // Fallback in case bg-page is not present
        "bg-gradient-to-b from-background via-background to-background",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-full px-4 sm:px-6 lg:px-8 pb-24 md:pb-10",
          !fullWidth && "max-w-6xl mx-auto"
        )}
      >
        {children}
      </div>
    </div>
  );
}

