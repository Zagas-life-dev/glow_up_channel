const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface QRProfile {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  userId: string;
  skills?: string[];
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
  };
  profile: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled: boolean;
    country?: string;
    province?: string;
    city?: string;
    careerStage?: string;
    skills?: string[];
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

  const data = await response.json();
  return data.data;
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

  const data = await response.json();
  return data.data;
}

// Update QR profile (requires auth token)
export async function updateQRProfile(
  token: string,
  updates: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/qrcode/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
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

  const data = await response.json();
  return data.data.avatarUrl;
}

