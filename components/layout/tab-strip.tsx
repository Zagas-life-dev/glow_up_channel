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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = React.useState(false);
  const [showRight, setShowRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className={cn("relative", className)}>
      {showLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 flex w-10 items-center bg-gradient-to-r from-page/95 to-transparent" />
      )}
      {showRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-page/95 to-transparent" />
      )}
      <div
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide px-1 sm:px-0"
        style={{ scrollBehavior: "smooth" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;

          let iconNode: React.ReactNode = null;
          if (tab.icon) {
            if (React.isValidElement(tab.icon)) {
              iconNode = React.cloneElement(tab.icon as React.ReactElement, {
                className: cn(
                  "h-4 w-4 flex-shrink-0",
                  (tab.icon as any).props?.className,
                  isActive && "text-orange-500"
                ),
              });
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
                "relative flex flex-shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {iconNode}
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

