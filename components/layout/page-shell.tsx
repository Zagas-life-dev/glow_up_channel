"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional max-width container; defaults to a centered column. */
  fullWidth?: boolean;
  /** Channel chat: fill main flex column, no min-h-screen — enables inner message scroll */
  chatMode?: boolean;
}

export function PageShell({
  children,
  className,
  fullWidth = false,
  chatMode = false,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        chatMode
          ? "flex min-h-0 flex-1 flex-col overflow-x-hidden bg-transparent"
          : "min-h-screen bg-page bg-gradient-to-b from-background via-background to-background",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-full px-4 sm:px-6 lg:px-8",
          chatMode
            ? "flex min-h-0 flex-1 flex-col overflow-x-hidden pb-0 pt-0 md:pb-10"
            : "pb-24 md:pb-10",
          !fullWidth && "max-w-6xl mx-auto"
        )}
      >
        {children}
      </div>
    </div>
  );
}

