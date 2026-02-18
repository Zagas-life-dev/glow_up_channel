"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { ProfileEditor } from "@/components/profile-editor";
import { UserInfoCard } from "@/components/user-info-card";
import { QRVisibilityOptions } from "@/components/qr-visibility-options";
import { getMyQRCode, updateQRProfile, MyQRCodeData, QRDisplayOptions } from "@/lib/api";
import { Loader2, AlertCircle, Lock } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<MyQRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    let authToken = searchParams.get("token");

    if (typeof window !== "undefined") {
      if (authToken) {
        localStorage.setItem("accessToken", authToken);
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      } else {
        authToken =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("authToken") ||
          "";
      }
    }

    if (!authToken) {
      setError(
        "Please log in to view your QR code. Open this from GlowUp → Profile → QR icon, or Settings → Manage QR Profile."
      );
      setLoading(false);
      return;
    }

    setToken(authToken);

    async function fetchData(currentToken: string) {
      try {
        setLoading(true);
        setError(null);
        const qrData = await getMyQRCode(currentToken);
        setData(qrData);
      } catch (err: any) {
        console.error("Error fetching QR data:", err);
        setError(err.message || "Failed to load QR code");
      } finally {
        setLoading(false);
      }
    }

    fetchData(authToken);
  }, [searchParams]);

  // Refetch when window regains focus so edits in the main GlowUp app (e.g. profile/settings) are reflected
  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      getMyQRCode(token).then(setData).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token]);

  const handleSave = async (updates: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
    qrDisplayOptions?: QRDisplayOptions;
  }) => {
    if (!token) throw new Error("Not authenticated");
    await updateQRProfile(token, updates);
    const updatedData = await getMyQRCode(token);
    setData(updatedData);
  };

  const handleVisibilityUpdate = async (next: QRDisplayOptions) => {
    if (!token) return;
    setSavingVisibility(true);
    try {
      await updateQRProfile(token, { qrDisplayOptions: next });
      const updatedData = await getMyQRCode(token);
      setData(updatedData);
    } finally {
      setSavingVisibility(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-qr-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-qr-surface border border-qr-border flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
          <p className="text-sm text-qr-muted">Loading your card…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-qr-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-qr-surface border border-qr-border p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-qr-text">Can’t load your card</h1>
            <p className="text-sm text-qr-muted mt-1">{error}</p>
          </div>
          {!token && (
            <p className="text-xs text-qr-muted">
              Open from <span className="text-qr-text font-medium">GlowUp</span> (Profile or Settings).
            </p>
          )}
        </div>
      </div>
    );
  }

  const isDisabled = !data.profile.qrCodeEnabled;

  return (
    <div className="min-h-screen bg-qr-bg text-qr-text">
      <div className="qr-dashboard min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-8 pb-16">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold tracking-tight">QR Card</h1>
              <p className="text-xs text-qr-muted mt-0.5">One scan, your contact</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-qr-surface border border-qr-border">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-qr-muted truncate max-w-[140px]">{data.user.email}</span>
            </div>
          </header>

          {/* Hidden state banner */}
          {isDisabled && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-200">Card is hidden</p>
                <p className="text-xs text-amber-200/70">Turn it on in Customize below so others can scan.</p>
              </div>
            </div>
          )}

          {/* Hero: QR + actions – use env link for generated QR when set */}
          <section className="mb-10">
            <QRCodeDisplay
              qrCodeUrl={
                typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL
                  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/profile/${data.userId}`
                  : data.qrCodeUrl
              }
              userId={data.userId}
            />
          </section>

          {/* What people see */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-qr-muted mb-3">What people see</h2>
            <UserInfoCard data={data} />
          </section>

          {/* What to show on your card */}
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-qr-muted mb-3">Choose what to display</h2>
            <QRVisibilityOptions
              options={data.profile.qrDisplayOptions}
              onUpdate={handleVisibilityUpdate}
              saving={savingVisibility}
            />
          </section>

          {/* Customize */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-qr-muted mb-3">Customize</h2>
            <ProfileEditor
              initialData={{
                phoneNumber: data.profile.phoneNumber ?? undefined,
                bio: data.profile.bio ?? undefined,
                avatarUrl: data.profile.avatarUrl ?? undefined,
                qrCodeEnabled: data.profile.qrCodeEnabled,
              }}
              userData={data.user}
              token={token}
              onSave={handleSave}
            />
          </section>

          <footer className="mt-12 pt-6 border-t border-qr-border text-center">
            <p className="text-xs text-qr-muted">Powered by GlowUp</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-qr-bg flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
