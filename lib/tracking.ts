/**
 * User Activity Tracking Utility
 *
 * Tracks:
 * - Visits: when someone opens the site at all, signed in or not.
 * - Active Daily Users: signed-in people who did something that counts as using the
 *   product that day.
 *
 * What counts is decided by the SERVER, in services/userActivityService.js. This file
 * can only report what happened; it cannot promote an action into the active-user
 * definition. That split is deliberate — this bundle is served from a CDN and a visitor
 * may be running a days-old copy of it, so a definition that lived here could not be
 * changed without waiting out every cache.
 *
 * The server sorts what it receives into three tiers:
 *
 *   PRIMARY   — one occurrence makes the user active for that day. These are the acts
 *               that only happen on purpose.
 *   SECONDARY — real interactions, individually too weak to mean much. Three of them
 *               in a UTC day (repeats included) makes the user active.
 *   NAVIGATION — never counted, and never even sent. Route changes, tab switches,
 *               infinite-scroll paging, back/forward/refresh. Movement is not usage,
 *               and paging alone would qualify every idle session.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Actions that make a signed-in user active on a single occurrence.
 * Mirrors ACTIVE_USER_ACTIONS on the server; the server is authoritative if the two
 * ever drift.
 */
export type PrimaryAction =
  | 'content_view'
  | 'like'
  | 'save'
  | 'share'
  | 'playlist_add'
  | 'playlist_open'
  | 'playlist_create'
  | 'search'
  | 'apply';

/**
 * Actions that count only in aggregate — three or more in a day.
 * Mirrors SECONDARY_USER_ACTIONS on the server.
 */
export type SecondaryAction =
  | 'playlist_discover'
  | 'playlist_edit'
  | 'playlist_delete'
  | 'playlist_item_remove'
  | 'playlist_save'
  | 'playlist_share'
  | 'collaborator_invite'
  | 'invitation_respond'
  | 'tracker_open'
  | 'tracker_answer'
  | 'tracker_status_update'
  | 'resource_progress'
  | 'filter_apply'
  | 'profile_edit'
  | 'connection_request'
  | 'connection_respond'
  | 'content_submit'
  | 'locked_in_session'
  | 'push_enable';

/** Kept for the older call sites. `content_view` and friends are the primary tier. */
export type ActiveUserAction = PrimaryAction;

/** Actions reported but NOT counted toward active users. Recorded for other analytics. */
export type NonQualifyingAction = 'repost' | 'post_created' | 'community_engagement';

export type TrackedAction = PrimaryAction | SecondaryAction | NonQualifyingAction;

/**
 * Get or create a session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

/**
 * Track a visit (user just opened the website)
 * This should be called once when the app loads
 * Completely silent - never throws errors or logs to console
 */
export function trackVisit(): void {
  // Fire and forget - use setTimeout to make it truly async and non-blocking
  setTimeout(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        
        // Check if we've already tracked a visit in this session
        const visitTracked = sessionStorage.getItem('visitTracked');
        if (visitTracked === 'true') {
          return; // Already tracked in this session
        }

        const sessionId = getSessionId();
        if (!sessionId) {
          return; // Can't track without session ID
        }

        const token = localStorage.getItem('accessToken');

        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        try {
          const response = await fetch(`${API_BASE_URL}/api/user-activity/track-visit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
              'X-Session-Id': sessionId
            },
            body: JSON.stringify({
              sessionId
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            sessionStorage.setItem('visitTracked', 'true');
          }
          // Silently ignore all other responses
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          // Completely silent - don't log anything
        }
      } catch (error) {
        // Completely silent - don't log anything
      }
    })();
  }, 0);
}

/**
 * Report one action to the activity log.
 *
 * Whether it counts toward active users is the server's call — see ACTIVE_USER_ACTIONS
 * in services/userActivityService.js. Everything sent here is stored either way.
 *
 * Fire-and-forget: never throws, never logs, never blocks the UI.
 */
export function trackActiveActivity(
  action: TrackedAction,
  details: {
    contentType?: 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community';
    contentId?: string;
    page?: string;
  } = {}
): void {
  // Fire and forget - use setTimeout to make it truly async and non-blocking
  setTimeout(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('accessToken');
        if (!token) {
          // User must be authenticated to track active activities
          return;
        }

        const sessionId = getSessionId();
        if (!sessionId) {
          return;
        }

        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        try {
          const response = await fetch(`${API_BASE_URL}/api/user-activity/track-active`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Session-Id': sessionId
            },
            body: JSON.stringify({
              sessionId,
              activityDetails: {
                action,
                contentType: details.contentType,
                contentId: details.contentId,
                page: details.page || window.location.pathname
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          // Completely silent - ignore all responses
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          // Completely silent - don't log anything
        }
      } catch (error) {
        // Completely silent - don't log anything
      }
    })();
  }, 0);
}

/**
 * Track content view (when user opens event/opportunity/job/resource detail page)
 */
export function trackContentView(
  contentType: 'opportunity' | 'event' | 'job' | 'resource',
  contentId: string
): void {
  trackActiveActivity('content_view', {
    contentType,
    contentId
  });
}

/**
 * Track like action
 * For posts, this also tracks community engagement automatically
 */
export function trackLike(
  contentType: 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'opportunities' | 'events' | 'jobs' | 'resources',
  contentId: string
): void {
  // Normalize contentType (opportunities -> opportunity, etc.)
  const normalizedType = contentType === 'opportunities' ? 'opportunity' 
    : contentType === 'events' ? 'event'
    : contentType === 'jobs' ? 'job'
    : contentType === 'resources' ? 'resource'
    : contentType;
  
  trackActiveActivity('like', {
    contentType: normalizedType as 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community',
    contentId
  });
  
  // If it's a post, also track as community engagement
  if (normalizedType === 'post') {
    trackActiveActivity('community_engagement', {
      contentType: 'community',
      contentId
    });
  }
}

/**
 * Track share action
 */
export function trackShare(
  contentType: 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'opportunities' | 'events' | 'jobs' | 'resources',
  contentId: string
): void {
  // Normalize contentType (opportunities -> opportunity, etc.)
  const normalizedType = contentType === 'opportunities' ? 'opportunity' 
    : contentType === 'events' ? 'event'
    : contentType === 'jobs' ? 'job'
    : contentType === 'resources' ? 'resource'
    : contentType;
  
  trackActiveActivity('share', {
    contentType: normalizedType as 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community',
    contentId
  });
}

/**
 * Track repost action
 */
export function trackRepost(
  postId: string
): void {
  trackActiveActivity('repost', {
    contentType: 'post',
    contentId: postId
  });
  
  // Also track as community engagement
  trackActiveActivity('community_engagement', {
    contentType: 'community',
    contentId: postId
  });
}

/**
 * Track save/bookmark action
 */
export function trackSave(
  contentType: 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'opportunities' | 'events' | 'jobs' | 'resources',
  contentId: string
): void {
  // Normalize contentType (opportunities -> opportunity, etc.)
  const normalizedType = contentType === 'opportunities' ? 'opportunity' 
    : contentType === 'events' ? 'event'
    : contentType === 'jobs' ? 'job'
    : contentType === 'resources' ? 'resource'
    : contentType;
  
  trackActiveActivity('save', {
    contentType: normalizedType as 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community',
    contentId
  });
  
  // If it's a post, also track as community engagement
  if (normalizedType === 'post') {
    trackActiveActivity('community_engagement', {
      contentType: 'community',
      contentId
    });
  }
}

/**
 * Track post creation
 */
export function trackPostCreated(postId: string): void {
  trackActiveActivity('post_created', {
    contentType: 'post',
    contentId: postId
  });
  
  // Also track as community engagement
  trackActiveActivity('community_engagement', {
    contentType: 'community',
    contentId: postId
  });
}

/**
 * Track community engagement (when user opens community and engages with posts)
 */
export function trackCommunityEngagement(action: 'view' | 'like' | 'reply' | 'repost' | 'save' | 'vote' | 'share', postId?: string): void {
  trackActiveActivity('community_engagement', {
    contentType: 'community',
    contentId: postId
  });
}

/**
 * Track add to playlist.
 *
 * Reported as `playlist_add`, not as `save`. They were the same action here, which meant
 * the log could not tell curating from bookmarking and the two could never be counted or
 * weighted separately.
 */
export function trackAddToPlaylist(
  contentType: 'opportunity' | 'event' | 'job' | 'resource' | 'opportunities' | 'events' | 'jobs' | 'resources',
  contentId: string
): void {
  // Normalize contentType
  const normalizedType = contentType === 'opportunities' ? 'opportunity' 
    : contentType === 'events' ? 'event'
    : contentType === 'jobs' ? 'job'
    : contentType === 'resources' ? 'resource'
    : contentType;
  
  trackActiveActivity('playlist_add', {
    contentType: normalizedType as 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community',
    contentId
  });
}

/**
 * Track that the reader ran a search.
 *
 * Deduplicated to one event per tab session per UTC day. The search box refetches on a
 * 400ms debounce and on every tab switch, so reporting each one would write hundreds of
 * rows per session into `user_activities` to answer a question — "did this person search
 * today?" — that a single row already answers. The search term itself is not sent.
 */
export function trackSearch(): void {
  if (typeof window === 'undefined') return;

  try {
    // UTC to match how the server buckets its `date` field, so the dedup window and the
    // day being counted are the same window.
    const today = new Date().toISOString().slice(0, 10);
    const key = `searchTracked:${today}`;
    if (sessionStorage.getItem(key) === 'true') return;
    sessionStorage.setItem(key, 'true');
  } catch {
    // Storage unavailable (private mode, storage disabled). Report the search rather
    // than dropping it — an extra row is a much smaller problem than an active user who
    // never registers as one.
  }

  trackActiveActivity('search', { page: '/search' });
}

/**
 * Track a click on an apply / register / open CTA.
 *
 * This is the strongest intent signal the platform can observe: the last thing it sees
 * before the browser leaves for someone else's site.
 */
export function trackApply(
  contentType: 'opportunity' | 'event' | 'job' | 'resource',
  contentId: string
): void {
  trackActiveActivity('apply', { contentType, contentId });
}

/**
 * Track comment/reply action
 */
export function trackComment(postId: string): void {
  trackActiveActivity('community_engagement', {
    contentType: 'community',
    contentId: postId
  });
}

/**
 * Track vote in poll
 */
export function trackVote(postId: string): void {
  trackActiveActivity('community_engagement', {
    contentType: 'community',
    contentId: postId
  });
}

/* ------------------------------------------------------------------------- *
 * Secondary-tier reporting.
 *
 * Everything below reports an action the server files under SECONDARY_USER_ACTIONS:
 * individually too weak to make someone an active user, but three or more of them in a
 * day is a real session. Repeats count toward that total, which is why the two noisy
 * ones here are throttled rather than sent raw — a PDF page-turn listener firing sixty
 * times is one person reading, not sixty acts of engagement, and writing sixty rows to
 * answer a question that three can answer is just cost.
 * ------------------------------------------------------------------------- */

/**
 * Allow an action through at most once per `windowMs` for a given key.
 *
 * Returns true when the caller should report. Storage failures return true: an extra
 * row is a far smaller problem than an active user who never registers as one.
 */
function throttle(key: string, windowMs: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storageKey = `track:${key}`;
    const last = Number(sessionStorage.getItem(storageKey) || 0);
    const now = Date.now();
    if (last && now - last < windowMs) return false;
    sessionStorage.setItem(storageKey, String(now));
    return true;
  } catch {
    return true;
  }
}

/** Opened a playlist and looked at what is in it. Primary tier — counts on its own. */
export function trackPlaylistOpen(playlistId: string): void {
  trackActiveActivity('playlist_open', { contentId: playlistId });
}

/** Made a new playlist. Primary tier — counts on its own. */
export function trackPlaylistCreate(playlistId: string): void {
  trackActiveActivity('playlist_create', { contentId: playlistId });
}

/** Opened Discover to browse public playlists — the explore-and-find-more surface. */
export function trackPlaylistDiscover(): void {
  // Once a minute: the tab refetches on focus and on every tab switch back.
  if (!throttle('playlist_discover', 60 * 1000)) return;
  trackActiveActivity('playlist_discover', { page: '/playlists' });
}

export function trackPlaylistEdit(playlistId: string): void {
  trackActiveActivity('playlist_edit', { contentId: playlistId });
}

export function trackPlaylistDelete(playlistId: string): void {
  trackActiveActivity('playlist_delete', { contentId: playlistId });
}

export function trackPlaylistItemRemove(playlistId: string): void {
  trackActiveActivity('playlist_item_remove', { contentId: playlistId });
}

/** Saved someone else's public playlist. */
export function trackPlaylistSave(playlistId: string): void {
  trackActiveActivity('playlist_save', { contentId: playlistId });
}

export function trackPlaylistShare(playlistId: string): void {
  trackActiveActivity('playlist_share', { contentId: playlistId });
}

export function trackCollaboratorInvite(playlistId: string): void {
  trackActiveActivity('collaborator_invite', { contentId: playlistId });
}

/** Accepted or declined a playlist invitation. */
export function trackInvitationRespond(playlistId: string): void {
  trackActiveActivity('invitation_respond', { contentId: playlistId });
}

/** Opened the tracker page to look at their own applications. */
export function trackTrackerOpen(): void {
  if (!throttle('tracker_open', 60 * 1000)) return;
  trackActiveActivity('tracker_open', { page: '/tracker' });
}

/** Answered the return sheet. The honesty tracker's whole point. */
export function trackTrackerAnswer(): void {
  trackActiveActivity('tracker_answer', { page: '/tracker' });
}

/** Moved an entry along its lifecycle from the tracker page. */
export function trackTrackerStatusUpdate(): void {
  trackActiveActivity('tracker_status_update', { page: '/tracker' });
}

/**
 * Read further into an in-app resource.
 *
 * Throttled to one report a minute per resource. Page-turn events fire far too often
 * to send raw, and a minute of sustained reading is the unit that actually means
 * something: three of them is someone who sat down with the thing.
 */
export function trackResourceProgress(resourceId: string): void {
  if (!throttle(`resource_progress:${resourceId}`, 60 * 1000)) return;
  trackActiveActivity('resource_progress', { contentType: 'resource', contentId: resourceId });
}

/**
 * Narrowed the feed or search by a real filter.
 *
 * Explicitly NOT a tab switch — switching between All / Jobs / Events is navigation and
 * is never reported. This is a category, location or type filter being applied.
 */
export function trackFilterApply(): void {
  if (!throttle('filter_apply', 10 * 1000)) return;
  trackActiveActivity('filter_apply');
}

export function trackProfileEdit(): void {
  trackActiveActivity('profile_edit');
}

export function trackConnectionRequest(userId: string): void {
  trackActiveActivity('connection_request', { contentId: userId });
}

/** Accepted or declined a connection request. */
export function trackConnectionRespond(userId: string): void {
  trackActiveActivity('connection_respond', { contentId: userId });
}

/** Submitted a listing for review. */
export function trackContentSubmit(contentType: 'opportunity' | 'event' | 'job' | 'resource'): void {
  trackActiveActivity('content_submit', { contentType });
}

/** Finished a Locked In focus session. */
export function trackLockedInSession(): void {
  trackActiveActivity('locked_in_session');
}

/** Turned push notifications on. */
export function trackPushEnable(): void {
  trackActiveActivity('push_enable');
}
