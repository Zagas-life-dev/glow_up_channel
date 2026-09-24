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
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1 sm:px-0"
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
                    isActive && "text-up-orange dark:text-[#B8551E]"
                  ),
                }
              );
            } else {
              const IconComp = tab.icon as React.ComponentType<any>;
              iconNode = (
                <IconComp
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive && "text-up-orange dark:text-[#B8551E]"
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
                "flex h-[38px] flex-shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full px-[15px] text-sm font-semibold transition-colors",
                isActive
                  ? "bg-up-solid text-up-on-solid"
                  : "text-muted-foreground hover:bg-up-fill hover:text-foreground"
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

