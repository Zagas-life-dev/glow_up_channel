"use client";

import { Eye, Loader2 } from "lucide-react";
import type { QRDisplayOptions } from "@/lib/api";

const OPTION_LABELS: Record<keyof QRDisplayOptions, string> = {
  showName: "Name",
  showEmail: "Email",
  showPhone: "Phone",
  showBio: "Bio",
  showPhoto: "Photo",
  showSkills: "Skills",
  showHeadline: "Headline",
  showWork: "Job title & company",
  showEducation: "Education",
  showWebsite: "Website",
  showSocialLinks: "Social links",
  showLocation: "Location",
  showCareerStage: "Career stage",
};

const ORDER: (keyof QRDisplayOptions)[] = [
  "showName",
  "showPhoto",
  "showHeadline",
  "showEmail",
  "showPhone",
  "showWork",
  "showEducation",
  "showLocation",
  "showCareerStage",
  "showBio",
  "showSkills",
  "showWebsite",
  "showSocialLinks",
];

interface QRVisibilityOptionsProps {
  options: QRDisplayOptions | undefined;
  onUpdate: (next: QRDisplayOptions) => void;
  saving: boolean;
}

export function QRVisibilityOptions({ options, onUpdate, saving }: QRVisibilityOptionsProps) {
  const get = (key: keyof QRDisplayOptions): boolean => {
    if (!options || typeof options[key] !== "boolean") return true;
    return options[key] === true;
  };

  const toggle = (key: keyof QRDisplayOptions) => {
    const next = { ...options, [key]: !get(key) } as QRDisplayOptions;
    onUpdate(next);
  };

  return (
    <div className="rounded-2xl bg-qr-surface border border-qr-border overflow-hidden">
      <div className="px-4 py-3 border-b border-qr-border flex items-center gap-2">
        <Eye className="w-4 h-4 text-qr-muted" />
        <span className="text-sm font-medium text-qr-text">What to show on your card</span>
        {saving && <Loader2 className="w-4 h-4 text-orange-500 animate-spin ml-auto" />}
      </div>
      <div className="p-4 space-y-2">
        {ORDER.map((key) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl hover:bg-qr-surface-hover transition-colors cursor-pointer"
          >
            <span className="text-sm text-qr-text">{OPTION_LABELS[key]}</span>
            <input
              type="checkbox"
              checked={get(key)}
              onChange={() => toggle(key)}
              disabled={saving}
              className="w-4 h-4 rounded border-qr-border bg-qr-surface-hover text-orange-500 focus:ring-orange-500/50 disabled:opacity-50"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
