"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              if (!disabled) onSelect(type.id);
            }}
            disabled={disabled}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all duration-200 group",
              "bg-card border-border",
              "hover:bg-muted hover:border-border",
              disabled && "opacity-50 cursor-not-allowed",
              isActive && !disabled && "border-orange-500/40 ring-1 ring-orange-500/30"
            )}
          >
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
                type.color === "orange" && "bg-primary/10",
                type.color === "primary" && "bg-primary/10",
                type.color === "emerald" && "bg-emerald-500/10",
                type.color === "violet" && "bg-violet-500/10"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  type.color === "orange" && "text-orange-500",
                  type.color === "primary" && "text-primary",
                  type.color === "emerald" && "text-emerald-500",
                  type.color === "violet" && "text-violet-500"
                )}
              />
            </div>
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-orange-400 transition-colors">
              {type.title}
            </h3>
            {type.desc && (
              <p className="text-xs text-muted-foreground">{type.desc}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PostTypeSelector;

