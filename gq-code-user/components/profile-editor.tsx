"use client";

import { useState, FormEvent, useRef } from "react";
import { Save, Loader2, Upload, X, Camera } from "lucide-react";
import { uploadProfilePicture } from "@/lib/api";

interface ProfileEditorProps {
  initialData: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled: boolean;
  };
  userData?: {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    emailVerified?: boolean;
  };
  token: string;
  onSave: (data: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
  }) => Promise<void>;
}

export function ProfileEditor({ initialData, userData, token, onSave }: ProfileEditorProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber || "");
  const [bio, setBio] = useState(initialData.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || "");
  const [qrCodeEnabled, setQrCodeEnabled] = useState(initialData.qrCodeEnabled);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(initialData.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 5MB." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    setMessage(null);
    try {
      const uploadedUrl = await uploadProfilePicture(token, file);
      setAvatarUrl(uploadedUrl);
      setPreview(uploadedUrl);
      setMessage({ type: "success", text: "Photo updated." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Upload failed." });
      setPreview(initialData.avatarUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setAvatarUrl("");
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await onSave({
        phoneNumber: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        qrCodeEnabled,
      });
      setMessage({ type: "success", text: "Saved." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-qr-surface border border-qr-border overflow-hidden">
      <div className="p-5 space-y-5">
        {userData && (
          <p className="text-xs text-qr-muted">
            Signed in as <span className="text-qr-text font-medium">{userData.email}</span>. Name and email are managed in the main GlowUp app.
          </p>
        )}

        {/* Photo */}
        <div>
          <label className="block text-xs font-medium text-qr-muted mb-2">Photo</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {preview ? (
                <>
                  <img src={preview} alt="" className="w-16 h-16 rounded-xl object-cover bg-qr-surface-hover border border-qr-border" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-qr-surface-hover border border-qr-border border-dashed flex items-center justify-center">
                  <Camera className="w-6 h-6 text-qr-muted" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="avatar-upload"
                disabled={uploading}
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-qr-border bg-qr-surface-hover text-qr-text hover:border-orange-500/40 transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading…" : preview ? "Change" : "Upload"}
              </label>
              <p className="text-[11px] text-qr-muted mt-1">JPG, PNG or WebP, max 5MB</p>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-xs font-medium text-qr-muted mb-2">Phone</label>
          <input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 234 567 8900"
            className="w-full px-4 py-2.5 rounded-xl bg-qr-surface-hover border border-qr-border text-qr-text placeholder:text-qr-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-xs font-medium text-qr-muted mb-2">Bio (max 500)</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="A short line about you..."
            className="w-full px-4 py-2.5 rounded-xl bg-qr-surface-hover border border-qr-border text-qr-text placeholder:text-qr-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm resize-none"
          />
          <p className="text-[11px] text-qr-muted mt-1 text-right">{bio.length}/500</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-3 py-2">
          <input
            id="enabled"
            type="checkbox"
            checked={qrCodeEnabled}
            onChange={(e) => setQrCodeEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-qr-border bg-qr-surface-hover text-orange-500 focus:ring-orange-500/50"
          />
          <label htmlFor="enabled" className="text-sm font-medium text-qr-text cursor-pointer">
            Show my QR card to others
          </label>
        </div>

        {message && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              message.type === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
