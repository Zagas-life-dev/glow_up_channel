import type { User, UserProfile } from './api-client';

export interface NormalizedUser {
  id: string;
  email: string;
  role: string;
  status: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  approvedAt?: string;

  // Premium membership (mirrors user fields where present)
  isPremium?: boolean;
  premiumExpiresAt?: string | null;
  premiumPlanId?: string;

  // Basic identity
  firstName?: string;
  lastName?: string;
  name?: string;
  dateOfBirth?: string;

  // Contact & avatar
  profileImage?: string;
  phoneNumber?: string;

  // Location & career
  country?: string;
  province?: string;
  city?: string;
  careerStage?: string;

  // Interests & skills (merged arrays)
  interests: string[];
  industrySectors: string[];
  skills: string[];
  aspirations: string[];

  // Education
  educationLevel?: string;
  fieldOfStudy?: string;
  institution?: string;

  // Profile meta
  onboardingCompleted: boolean;
  completionPercentage?: number;
  bio?: string;
  headline?: string;
  website?: string;
  work?: {
    company?: string;
    title?: string;
  };
  education?: {
    school?: string;
    degree?: string;
    field?: string;
  };
  socialLinks?: Record<string, string>;
  isPrivate?: boolean;
  showConnections?: boolean;

  // Raw objects for advanced use-cases if ever needed
  _rawUser?: User | null;
  _rawProfile?: UserProfile | null;
}

function mergeStringArraysUnique(...arrays: Array<string[] | undefined | null>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const key = typeof item === 'string' ? item.trim() : item;
      if (!key) continue;
      const normalizedKey = key.toLowerCase();
      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey);
        result.push(key);
      }
    }
  }

  return result;
}

export function normalizeUser(user: User | null, profile: UserProfile | null): NormalizedUser | null {
  if (!user && !profile) {
    return null;
  }

  const baseId =
    user?.id ||
    user?._id ||
    profile?.userId ||
    profile?._id ||
    '';

  const firstName = user?.firstName ?? profile?.firstName;
  const lastName = user?.lastName ?? profile?.lastName;

  const name =
    user?.name ??
    (firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ') : undefined);

  const profileImage = user?.profileImage ?? profile?.profileImage;
  const phoneNumber = user?.phoneNumber ?? profile?.phoneNumber;

  const interests = mergeStringArraysUnique(profile?.interests, profile?.onboarding?.interests);
  const industrySectors = mergeStringArraysUnique(
    profile?.industrySectors,
    profile?.onboarding?.industrySectors
  );
  const skills = mergeStringArraysUnique(profile?.skills, profile?.onboarding?.skills);
  const aspirations = mergeStringArraysUnique(
    profile?.aspirations,
    profile?.onboarding?.aspirations
  );

  const onboardingCompleted =
    profile?.onboardingCompleted ??
    (profile?.completionPercentage === 100);

  const normalized: NormalizedUser = {
    id: baseId,
    email: user?.email ?? '',
    role: user?.role ?? 'user',
    status: user?.status ?? 'active',
    isActive: user?.isActive ?? true,
    emailVerified: user?.emailVerified ?? false,
    createdAt: user?.createdAt ?? new Date().toISOString(),
    approvedAt: user?.approvedAt,

    firstName,
    lastName,
    name,
    dateOfBirth: user?.dateOfBirth,

    profileImage,
    phoneNumber,

    country: profile?.country ?? profile?.onboarding?.country,
    province: profile?.province ?? profile?.onboarding?.province,
    city: profile?.city ?? profile?.onboarding?.city,
    careerStage: profile?.careerStage ?? profile?.onboarding?.careerStage,

    interests,
    industrySectors,
    skills,
    aspirations,

    educationLevel: profile?.educationLevel ?? profile?.onboarding?.educationLevel,
    fieldOfStudy: profile?.fieldOfStudy ?? profile?.onboarding?.fieldOfStudy,
    institution: profile?.institution ?? profile?.onboarding?.institution,

    onboardingCompleted,
    completionPercentage: profile?.completionPercentage,
    bio: profile?.bio,
    headline: profile?.headline,
    website: profile?.website,
    work: profile?.work,
    education: profile?.education,
    socialLinks: profile?.socialLinks,
    isPrivate: profile?.isPrivate,
    showConnections: profile?.showConnections,

    isPremium: user?.isPremium,
    premiumExpiresAt: (user as any)?.premiumExpiresAt ?? null,
    premiumPlanId: (user as any)?.premiumPlanId,

    _rawUser: user,
    _rawProfile: profile,
  };

  return normalized;
}

