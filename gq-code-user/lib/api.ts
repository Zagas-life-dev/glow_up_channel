const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/** Which fields to show on the public QR profile. Default true when missing. */
export interface QRDisplayOptions {
  showName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showBio?: boolean;
  showPhoto?: boolean;
  showSkills?: boolean;
  showHeadline?: boolean;
  showWork?: boolean;
  showEducation?: boolean;
  showWebsite?: boolean;
  showSocialLinks?: boolean;
  showLocation?: boolean;
  showCareerStage?: boolean;
}

export const DEFAULT_QR_DISPLAY_OPTIONS: QRDisplayOptions = {
  showName: true,
  showEmail: true,
  showPhone: true,
  showBio: true,
  showPhoto: true,
  showSkills: true,
  showHeadline: true,
  showWork: true,
  showEducation: true,
  showWebsite: true,
  showSocialLinks: true,
  showLocation: true,
  showCareerStage: true,
};

export interface QRProfile {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  userId: string;
  skills?: string[] | null;
  headline?: string | null;
  website?: string | null;
  work?: { company?: string; title?: string } | null;
  education?: { school?: string; degree?: string; field?: string } | null;
  socialLinks?: Record<string, string>;
  location?: string | null;
  careerStage?: string | null;
  qrDisplayOptions?: QRDisplayOptions;
}

export interface MyQRCodeData {
  qrCodeUrl: string;
  userId: string;
  user: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name: string;
    dateOfBirth?: string;
    role: string;
    emailVerified: boolean;
    headline?: string | null;
    website?: string | null;
    work?: { company?: string; title?: string } | null;
    education?: { school?: string; degree?: string; field?: string } | null;
    socialLinks?: Record<string, string>;
  };
  profile: {
    phoneNumber?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    qrCodeEnabled: boolean;
    country?: string | null;
    province?: string | null;
    city?: string | null;
    careerStage?: string | null;
    skills?: string[] | null;
    qrDisplayOptions?: QRDisplayOptions;
  };
}

// Get public profile by userId (no auth required)
export async function getPublicProfile(userId: string): Promise<QRProfile> {
  const response = await fetch(`${API_BASE_URL}/api/qrcode/profile/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch profile');
  }

  const json = await response.json();

  const raw = json.data as {
    userId: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phoneNumber?: string | null;
    bio?: string | null;
    profileImage?: string | null;
    skills?: string[] | null;
    headline?: string | null;
    website?: string | null;
    work?: { company?: string; title?: string } | null;
    education?: { school?: string; degree?: string; field?: string } | null;
    socialLinks?: Record<string, string>;
    location?: string | null;
    careerStage?: string | null;
    qrDisplayOptions?: QRDisplayOptions;
  };

  return {
    userId: raw.userId,
    name: raw.name,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    email: raw.email,
    phoneNumber: raw.phoneNumber ?? null,
    bio: raw.bio ?? null,
    avatarUrl: raw.profileImage ?? null,
    skills: raw.skills ?? null,
    headline: raw.headline ?? null,
    website: raw.website ?? null,
    work: raw.work ?? null,
    education: raw.education ?? null,
    socialLinks: raw.socialLinks ?? undefined,
    location: raw.location ?? null,
    careerStage: raw.careerStage ?? null,
    qrDisplayOptions: raw.qrDisplayOptions ?? undefined,
  };
}

// Get current user's QR code (requires auth token)
export async function getMyQRCode(token: string): Promise<MyQRCodeData> {
  const response = await fetch(`${API_BASE_URL}/api/qrcode/my-qrcode`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch QR code');
  }

  const json = await response.json();
  const raw = json.data as {
    qrCodeUrl: string;
    userId: string;
    user: {
      _id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      name: string;
      dateOfBirth?: string | null;
      role: string;
      emailVerified: boolean;
      headline?: string | null;
      website?: string | null;
      work?: { company?: string; title?: string } | null;
      education?: { school?: string; degree?: string; field?: string } | null;
      socialLinks?: Record<string, string>;
    };
    profile: {
      phoneNumber?: string | null;
      bio?: string | null;
      profileImage?: string | null;
      qrCodeEnabled: boolean;
      country?: string | null;
      province?: string | null;
      city?: string | null;
      careerStage?: string | null;
      skills?: string[] | null;
      qrDisplayOptions?: QRDisplayOptions;
    };
  };

  return {
    qrCodeUrl: raw.qrCodeUrl,
    userId: raw.userId,
    user: {
      _id: raw.user._id,
      email: raw.user.email,
      firstName: raw.user.firstName ?? undefined,
      lastName: raw.user.lastName ?? undefined,
      name: raw.user.name,
      dateOfBirth: raw.user.dateOfBirth ?? undefined,
      role: raw.user.role,
      emailVerified: raw.user.emailVerified,
      headline: raw.user.headline ?? undefined,
      website: raw.user.website ?? undefined,
      work: raw.user.work ?? undefined,
      education: raw.user.education ?? undefined,
      socialLinks: raw.user.socialLinks ?? undefined,
    },
    profile: {
      phoneNumber: raw.profile.phoneNumber ?? null,
      bio: raw.profile.bio ?? null,
      avatarUrl: raw.profile.profileImage ?? null,
      qrCodeEnabled: raw.profile.qrCodeEnabled,
      country: raw.profile.country ?? null,
      province: raw.profile.province ?? null,
      city: raw.profile.city ?? null,
      careerStage: raw.profile.careerStage ?? null,
      skills: raw.profile.skills ?? null,
      qrDisplayOptions: raw.profile.qrDisplayOptions ?? undefined,
    },
  };
}

// Update QR profile (requires auth token)
export async function updateQRProfile(
  token: string,
  updates: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
    qrDisplayOptions?: QRDisplayOptions;
  }
): Promise<void> {
  const backendPayload: Record<string, unknown> = {};
  if (updates.phoneNumber !== undefined) backendPayload.phoneNumber = updates.phoneNumber;
  if (updates.bio !== undefined) backendPayload.bio = updates.bio;
  if (updates.avatarUrl !== undefined) backendPayload.profileImage = updates.avatarUrl;
  if (updates.qrCodeEnabled !== undefined) backendPayload.qrCodeEnabled = updates.qrCodeEnabled;
  if (updates.qrDisplayOptions !== undefined) backendPayload.qrDisplayOptions = updates.qrDisplayOptions;

  const response = await fetch(`${API_BASE_URL}/api/qrcode/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(backendPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }
}

// Upload profile picture (requires auth token)
export async function uploadProfilePicture(
  token: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/qrcode/upload/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload profile picture');
  }

  const json = await response.json();
  // Backend returns { data: { profileImage: string } }
  return json.data.profileImage as string;
}

