'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProfileCard } from '@/components/profile-card';
import { getPublicProfile, QRProfile } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<QRProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicProfile(userId);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen profile-page-wrap flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl profile-card-bg border profile-border shadow-lg flex items-center justify-center">
            <Loader2 className="w-8 h-8 profile-accent-icon animate-spin" />
          </div>
          <p className="text-sm profile-text-muted">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen profile-page-wrap flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl profile-card-bg border profile-border shadow-lg p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 profile-accent-icon" />
          </div>
          <div>
            <h1 className="text-lg font-semibold profile-text-primary">Profile not available</h1>
            <p className="text-sm profile-text-muted mt-2">
              {error || 'This QR profile is not available or has been disabled.'}
            </p>
          </div>
          <footer className="pt-6 profile-border border-t">
            <p className="text-xs profile-text-muted">Powered by GlowUp</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen profile-page-wrap">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14 pb-24">
        <ProfileCard profile={profile} />
        <footer className="mt-12 pt-8 profile-border border-t text-center">
          <p className="text-xs profile-text-muted">Powered by GlowUp</p>
        </footer>
      </div>
    </div>
  );
}
