/**
 * URL utility functions for handling internal vs external links
 * Based on Next.js and React best practices
 */

/**
 * Checks if a URL is external (not part of the current domain) after cleaning
 * @param url - The URL to check
 * @returns boolean - true if external, false if internal
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false
  
  const cleanedUrl = cleanUrl(url)
  
  // Check if it's a valid URL
  try {
    const urlObj = new URL(cleanedUrl)
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : ''
    
    // If it's a different domain, it's external
    return urlObj.hostname !== currentDomain
  } catch {
    // If it's not a valid URL, check if it starts with http/https
    return cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')
  }
}

/**
 * Checks if a string is a valid MongoDB ObjectId
 * @param id - The string to check
 * @returns boolean - true if valid ObjectId, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  if (!id) return false
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Cleans URLs that have been incorrectly prefixed with route paths
 * Examples: 
 * - "event/www.global.com" → "https://www.global.com"
 * - "opportunities/www.example.com" → "https://www.example.com"
 * - "jobs/company.com" → "https://company.com"
 * - "https://www.example.com" → "https://www.example.com" (unchanged)
 * - "//www.example.com" → "//www.example.com" (unchanged - double slash)
 * @param url - The URL to clean
 * @returns string - The cleaned URL
 */
export function cleanUrl(url: string): string {
  if (!url) return url
  
  // If it already has a protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url
  }
  
  // Pattern to match: [route]/www.[domain] or [route]/[domain]
  // Examples: event/www.global.com, opportunities/www.example.com, jobs/company.com
  const routePrefixPattern = /^(opportunities?|events?|jobs?|resources?)\/(www\.)?(.+)$/i
  const match = url.match(routePrefixPattern)
  
  if (match) {
    const [, , wwwPrefix, domain] = match
    // Reconstruct the URL with https:// protocol
    return `https://${wwwPrefix || ''}${domain}`
  }
  
  // If it starts with www. but no route prefix, add https://
  if (url.startsWith('www.')) {
    return `https://${url}`
  }
  
  // If it looks like a domain (contains dots but no protocol), add https://
  if (url.includes('.') && !url.includes('/') && !url.startsWith('//')) {
    return `https://${url}`
  }
  
  return url
}

/**
 * Checks if a string is a valid URL (after cleaning)
 * @param url - The string to check
 * @returns boolean - true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false
  
  const cleanedUrl = cleanUrl(url)
  try {
    new URL(cleanedUrl)
    return true
  } catch {
    return false
  }
}

/**
 * Determines the link type based on the ID/URL
 * @param id - The ID or URL to analyze
 * @returns 'internal' | 'external' | 'invalid'
 */
export function getLinkType(id: string): 'internal' | 'external' | 'invalid' {
  if (!id) return 'invalid'
  
  // Check if it's a valid ObjectId (internal)
  if (isValidObjectId(id)) {
    return 'internal'
  }
  
  // Check if it's a valid external URL
  if (isValidUrl(id) && isExternalUrl(id)) {
    return 'external'
  }
  
  return 'invalid'
}

/**
 * Safely opens a URL in a new tab with security attributes (after cleaning)
 * @param url - The URL to open
 * @param options - Additional options for window.open
 */
export function openExternalUrl(url: string, options: string = 'noopener,noreferrer'): void {
  if (!url) return
  
  const cleanedUrl = cleanUrl(url)
  
  try {
    window.open(cleanedUrl, '_blank', options)
  } catch (error) {
    console.error('Error opening external URL:', error)
    // Fallback: try to open in same tab
    window.location.href = cleanedUrl
  }
}
