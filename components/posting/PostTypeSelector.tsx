"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UP_KIND, type UpKind } from "@/components/up/kind";

/** Legacy colour names on the options map to the UP content kinds. */
const COLOR_KIND: Record<PostTypeColor, UpKind> = {
  orange: "opportunity",
  primary: "job",
  emerald: "event",
  violet: "resource",
};

const ACTIVE_BG: Record<UpKind, string> = {
  opportunity: "bg-up-orange-tint",
  job: "bg-up-fill",
  event: "bg-up-lime-tint",
  resource: "bg-up-fill",
};

export type PostTypeColor = "orange" | "primary" | "emerald" | "violet";

export type PostTypeOption<TId extends string = string> = {
  id: TId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: PostTypeColor;
  desc?: string;
};

interface PostTypeSelectorProps<TId extends string> {
  types: PostTypeOption<TId>[];
  selectedType: TId | null;
  onSelect: (id: TId) => void;
  disabled?: boolean;
}

export function PostTypeSelector<TId extends string>({
  types,
  selectedType,
  onSelect,
  disabled,
}: PostTypeSelectorProps<TId>) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = selectedType === type.id;
        const kind = COLOR_KIND[type.color ?? "orange"];

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              if (!disabled) onSelect(type.id);
            }}
            disabled={disabled}
            aria-pressed={isActive}
            className={cn(
              "group rounded-up-lg border-[1.5px] p-4 text-left transition-colors duration-200",
              disabled && "cursor-not-allowed opacity-50",
              // The chosen type: outlined navy (cream on dark) on its own tint.
              isActive && !disabled
                ? cn("border-up-solid", ACTIVE_BG[kind])
                : "border-border bg-card hover:border-up-border-hover"
            )}
          >
            <span className={cn("mb-3 grid h-11 w-11 place-items-center rounded-up-md", UP_KIND[kind].chip)}>
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <h3 className="mb-1 font-bold text-foreground">{type.title}</h3>
            {type.desc && <p className="text-xs text-muted-foreground">{type.desc}</p>}
          </button>
        );
      })}
    </div>
  );
}

export default PostTypeSelector;
