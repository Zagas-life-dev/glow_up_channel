'use client';

/**
 * Triggers backend cleanup of past/expired events, opportunities, and jobs
 * (live + inactive). Runs at most once per browser session so the app
 * can auto-trigger without hammering the API.
 */

import { useEffect } from 'react';

const CLEANUP_SESSION_KEY = 'glowup_past_content_cleanup_done';

export function useCleanupPastContent() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem(CLEANUP_SESSION_KEY) === '1') return;

    // Use same-origin API route so it works without CORS; route proxies to backend
    fetch('/api/cleanup/past-content', { method: 'POST', credentials: 'include' })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(CLEANUP_SESSION_KEY, '1');
      })
      .catch(() => {
        // Fire-and-forget; don't break the app
      });
  }, []);
}
