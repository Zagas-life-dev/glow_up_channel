import { normalizeUser, type NormalizedUser } from './user';
import type { User, UserProfile } from './api-client';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: 'user-id',
    email: 'test@example.com',
    role: 'opportunity_seeker',
    status: 'active',
    isActive: true,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    _id: 'profile-id',
    userId: 'user-id',
    country: 'NG',
    province: 'Lagos',
    careerStage: 'student',
    interests: [],
    industrySectors: [],
    educationLevel: 'undergraduate',
    skills: [],
    aspirations: [],
    onboardingCompleted: false,
    completionPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Simple harness-style checks; not using a full test runner assertion library.
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runNormalizeUserTests(): void {
  // Scalar precedence: user wins, profile fills gaps
  const user = makeUser({ firstName: 'User', lastName: 'Name', profileImage: 'user.jpg' });
  const profile = makeProfile({ firstName: 'Profile', profileImage: 'profile.jpg' });
  const normalized = normalizeUser(user, profile) as NormalizedUser;

  assert(normalized.firstName === 'User', 'User firstName should win over profile');
  assert(normalized.profileImage === 'user.jpg', 'User profileImage should win over profile');

  // Array merge + de-dup (case-insensitive)
  const profileWithArrays = makeProfile({
    interests: ['Tech', 'Design'],
    onboarding: {
      interests: ['tech', 'Health'],
      industrySectors: ['IT'],
      educationLevel: 'bachelor',
      aspirations: ['Growth'],
    },
  } as any);

  const normalizedWithArrays = normalizeUser(user, profileWithArrays) as NormalizedUser;

  assert(
    normalizedWithArrays.interests.length === 3 &&
      normalizedWithArrays.interests.some((v) => v.toLowerCase() === 'tech') &&
      normalizedWithArrays.interests.some((v) => v.toLowerCase() === 'design') &&
      normalizedWithArrays.interests.some((v) => v.toLowerCase() === 'health'),
    'Interests should merge with de-duplication',
  );
}

