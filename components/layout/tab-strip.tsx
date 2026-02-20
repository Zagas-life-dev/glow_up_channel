"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> | React.ReactNode;
}

interface TabStripProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabStrip({ tabs, activeId, onChange, className }: TabStripProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="flex overflow-x-auto scrollbar-hide px-1 sm:px-0"
        style={{ scrollBehavior: "smooth" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;

          let iconNode: React.ReactNode = null;
          if (tab.icon) {
            if (React.isValidElement(tab.icon)) {
              iconNode = React.cloneElement(
                tab.icon as React.ReactElement<{ className?: string }>,
                {
                  className: cn(
                    "h-4 w-4 flex-shrink-0",
                    (tab.icon as React.ReactElement<{ className?: string }>).props?.className,
                    isActive && "text-orange-500"
                  ),
                }
              );
            } else {
              const IconComp = tab.icon as React.ComponentType<any>;
              iconNode = (
                <IconComp
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive && "text-orange-500"
                  )}
                  aria-hidden
                />
              );
            }
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-card/80 backdrop-blur-sm border border-border/60 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60 hover:backdrop-blur-sm border border-transparent hover:border-border/50"
              )}
            >
              {iconNode}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

