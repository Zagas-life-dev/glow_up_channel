'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User, UserPlus } from 'lucide-react';
import { generateVCard, downloadVCard, shareContact } from '@/lib/vcard';
import { QRProfile } from '@/lib/api';

interface SaveContactButtonProps {
  profile: QRProfile;
  variant?: 'default' | 'card';
}

export function SaveContactButton({ profile, variant = 'default' }: SaveContactButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleSaveContact = async () => {
    setIsSharing(true);
    const normalized = {
      ...profile,
      firstName: profile.firstName ?? undefined,
      lastName: profile.lastName ?? undefined,
      phoneNumber: profile.phoneNumber ?? undefined,
      bio: profile.bio ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
    };
    try {
      const shared = await shareContact(normalized);
      if (!shared) {
        const vcard = generateVCard(normalized);
        const filename = `${profile.name.replace(/\s+/g, '_')}_contact.vcf`;
        downloadVCard(vcard, filename);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      const vcard = generateVCard(normalized);
      const filename = `${profile.name.replace(/\s+/g, '_')}_contact.vcf`;
      downloadVCard(vcard, filename);
    } finally {
      setIsSharing(false);
    }
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleSaveContact}
        disabled={isSharing}
        className="profile-accent relative flex flex-col items-start justify-between gap-3 p-5 rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed min-h-[128px] w-full text-left"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center ring-2 ring-white/30">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <User className="w-6 h-6 text-white/90" />
          )}
        </div>
        <span className="font-semibold text-white text-sm">
          {isSharing ? 'Saving...' : 'Save Contact'}
        </span>
        {isSharing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-orange-600/90">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleSaveContact}
      disabled={isSharing}
      className="profile-accent relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isSharing ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <UserPlus className="w-5 h-5" />
          <span>Save to Contacts</span>
        </>
      )}
    </button>
  );
}
