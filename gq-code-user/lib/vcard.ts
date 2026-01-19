// Generate vCard format for saving contacts
export function generateVCard(profile: {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
}): string {
  const { name, firstName, lastName, email, phoneNumber, bio, avatarUrl } = profile;

  // Parse name into components
  const nameParts = name.split(' ');
  const fn = firstName || nameParts[0] || '';
  const ln = lastName || nameParts.slice(1).join(' ') || '';

  let vcard = 'BEGIN:VCARD\n';
  vcard += 'VERSION:3.0\n';
  vcard += `FN:${name}\n`;
  vcard += `N:${ln};${fn};;;\n`;
  vcard += `EMAIL:${email}\n`;
  
  if (phoneNumber) {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    vcard += `TEL:${cleanPhone}\n`;
  }
  
  if (avatarUrl) {
    vcard += `PHOTO;VALUE=URL:${avatarUrl}\n`;
  }
  
  if (bio) {
    // Escape newlines in bio
    const escapedBio = bio.replace(/\n/g, '\\n');
    vcard += `NOTE:${escapedBio}\n`;
  }
  
  vcard += 'END:VCARD';
  
  return vcard;
}

// Download vCard file
export function downloadVCard(vcard: string, filename: string = 'contact.vcf'): void {
  const blob = new Blob([vcard], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Share contact using Web Share API (mobile)
export async function shareContact(profile: {
  name: string;
  email: string;
  phoneNumber?: string;
}): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = {
        title: `Contact: ${profile.name}`,
        text: `Email: ${profile.email}${profile.phoneNumber ? `\nPhone: ${profile.phoneNumber}` : ''}`,
      };
      await navigator.share(shareData);
      return true;
    } catch (error) {
      // User cancelled or error occurred
      return false;
    }
  }
  return false;
}



























