'use client';

import { useState } from 'react';
import { Download, Share2, UserPlus } from 'lucide-react';
import { generateVCard, downloadVCard, shareContact } from '@/lib/vcard';
import { QRProfile } from '@/lib/api';

interface SaveContactButtonProps {
  profile: QRProfile;
}

export function SaveContactButton({ profile }: SaveContactButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleSaveContact = async () => {
    setIsSharing(true);
    
    try {
      // Try Web Share API first (mobile)
      const shared = await shareContact(profile);
      
      if (!shared) {
        // Fallback to vCard download
        const vcard = generateVCard(profile);
        const filename = `${profile.name.replace(/\s+/g, '_')}_contact.vcf`;
        downloadVCard(vcard, filename);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      // Fallback to vCard download on error
      const vcard = generateVCard(profile);
      const filename = `${profile.name.replace(/\s+/g, '_')}_contact.vcf`;
      downloadVCard(vcard, filename);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleSaveContact}
      disabled={isSharing}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg hover:from-orange-600 hover:to-orange-700 hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
    >
      {isSharing ? (
        <>
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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

