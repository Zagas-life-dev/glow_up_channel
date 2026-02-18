"use client";

import { Mail, MapPin, Briefcase, Sparkles } from "lucide-react";
import { MyQRCodeData, QRDisplayOptions } from "@/lib/api";

function show(opts: QRDisplayOptions | undefined, key: keyof QRDisplayOptions): boolean {
  if (!opts || typeof opts[key] !== "boolean") return true;
  return opts[key] === true;
}

interface UserInfoCardProps {
  data: MyQRCodeData;
}

export function UserInfoCard({ data }: UserInfoCardProps) {
  const { user, profile } = data;
  const opts = profile.qrDisplayOptions;
  const location = [profile.city, profile.province, profile.country].filter(Boolean).join(", ");
  const showLocation = location && show(opts, "showLocation");
  const showCareerStage = profile.careerStage && show(opts, "showCareerStage");
  const showSkills = profile.skills && profile.skills.length > 0 && show(opts, "showSkills");
  const showAnyMeta = showLocation || showCareerStage || showSkills;

  return (
    <div className="rounded-2xl bg-qr-surface border border-qr-border overflow-hidden">
      <div className="p-5 flex gap-4">
        {show(opts, "showPhoto") && (
          <div className="shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover bg-qr-surface-hover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl font-bold text-white">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {show(opts, "showName") && (
            <p className="font-semibold text-qr-text truncate">{user.name || "No name"}</p>
          )}
          {show(opts, "showEmail") && (
            <div className="flex items-center gap-1.5 mt-1 text-qr-muted">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="text-sm truncate">{user.email}</span>
            </div>
          )}
          {show(opts, "showPhone") && profile.phoneNumber && (
            <p className="text-sm text-qr-muted mt-1 truncate">{profile.phoneNumber}</p>
          )}
        </div>
      </div>
      {showAnyMeta && (
        <div className="px-5 pb-4 flex flex-wrap gap-3 text-xs text-qr-muted">
          {showLocation && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {location}
            </span>
          )}
          {showCareerStage && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" />
              {profile.careerStage}
            </span>
          )}
          {showSkills && (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              {profile.skills!.slice(0, 3).join(", ")}
              {profile.skills!.length > 3 && ` +${profile.skills!.length - 3}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
