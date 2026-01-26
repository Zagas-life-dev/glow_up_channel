/**
 * User Activity Tracking Utility
 * 
 * Tracks:
 * - Visits: When users just open the website
 * - Active Daily Users: When users engage with content (like, share, repost, save, post, view content)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
 * Track active user activity (engagement)
 * This should be called when users:
 * - Open any event/opportunity/jobs/resources
 * - Engage with content (like, share, repost, save)
 * - Post anything to the community
 * - Open the community and engage with any post
 * 
 * This function is fire-and-forget and will never throw errors or log anything
 */
export function trackActiveActivity(
  action: 'content_view' | 'like' | 'share' | 'repost' | 'save' | 'post_created' | 'community_engagement',
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
 * Track add to playlist action
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
  
  trackActiveActivity('save', { // Adding to playlist is similar to saving
    contentType: normalizedType as 'opportunity' | 'event' | 'job' | 'resource' | 'post' | 'community',
    contentId
  });
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
