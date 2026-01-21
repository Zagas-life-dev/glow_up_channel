/**
 * Standardized error message utilities
 * Provides consistent error messages across the application
 */

export interface StandardError {
  title: string;
  description: string;
  type: 'authentication' | 'validation' | 'network' | 'server' | 'not_found' | 'duplicate' | 'permission' | 'unknown';
}

/**
 * Parse error and return standardized error message
 */
export function getStandardizedError(error: any): StandardError {
  const errorMessage = error?.message || String(error) || 'An unexpected error occurred';
  const lowerMessage = errorMessage.toLowerCase();

  // Authentication errors
  if (lowerMessage.includes('authentication') || 
      lowerMessage.includes('token') || 
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('login') ||
      lowerMessage.includes('sign in')) {
    return {
      title: 'Authentication Required',
      description: 'Please log in to continue.',
      type: 'authentication'
    };
  }

  // Validation errors
  if (lowerMessage.includes('validation') || 
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required') ||
      lowerMessage.includes('missing')) {
    return {
      title: 'Validation Error',
      description: 'Please check your input and try again.',
      type: 'validation'
    };
  }

  // Duplicate errors
  if (lowerMessage.includes('duplicate') || 
      lowerMessage.includes('already exists') ||
      lowerMessage.includes('already taken')) {
    return {
      title: 'Duplicate Entry',
      description: 'This item already exists. Please use a different value.',
      type: 'duplicate'
    };
  }

  // Not found errors
  if (lowerMessage.includes('not found') || 
      lowerMessage.includes('does not exist') ||
      lowerMessage.includes('404')) {
    return {
      title: 'Not Found',
      description: 'The requested resource could not be found.',
      type: 'not_found'
    };
  }

  // Permission errors
  if (lowerMessage.includes('permission') || 
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('insufficient')) {
    return {
      title: 'Access Denied',
      description: 'You do not have permission to perform this action.',
      type: 'permission'
    };
  }

  // Network errors
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('failed to fetch')) {
    return {
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'network'
    };
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || 
      lowerMessage.includes('too many requests') ||
      lowerMessage.includes('429')) {
    return {
      title: 'Too Many Requests',
      description: 'Please wait a moment before trying again.',
      type: 'server'
    };
  }

  // Server errors (500, 503, etc.)
  if (lowerMessage.includes('server error') || 
      lowerMessage.includes('internal error') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('503')) {
    return {
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      type: 'server'
    };
  }

  // Default/Unknown error
  return {
    title: 'Error',
    description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
    type: 'unknown'
  };
}

/**
 * Get user-friendly error message for toast notifications
 */
export function getErrorMessage(error: any): string {
  const standardized = getStandardizedError(error);
  return standardized.description;
}

/**
 * Get error title for display
 */
export function getErrorTitle(error: any): string {
  const standardized = getStandardizedError(error);
  return standardized.title;
}
