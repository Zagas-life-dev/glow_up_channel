/**
 * Anonymous visitor ID: get or create a UUID, persist in localStorage for tracking
 * (e.g. public feed requests and merge on signup).
 */

const STORAGE_KEY = 'glowup-anon-id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get existing anon ID from localStorage or create, store, and return a new one.
 */
export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || !id.trim()) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

/**
 * Clear anon ID from localStorage (e.g. after successful signup).
 */
export function clearAnonId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
