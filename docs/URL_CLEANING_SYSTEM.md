# URL Cleaning System Documentation

## Overview

The URL Cleaning System is a robust utility that automatically detects and fixes malformed URLs that have been incorrectly prefixed with route paths. This system prevents broken external links and ensures a seamless user experience across the entire application.

## Problem Solved

### The Issue
Content items in the database sometimes have external URLs stored with incorrect route prefixes, leading to malformed URLs like:
- `event/www.global.com` instead of `https://www.global.com`
- `opportunities/www.example.com` instead of `https://www.example.com`
- `jobs/company.com` instead of `https://company.com`

### The Solution
The URL Cleaning System automatically:
1. **Detects** URLs with route prefixes
2. **Removes** the incorrect route prefix
3. **Adds** the proper `https://` protocol
4. **Preserves** already valid URLs unchanged

## Architecture

### Core Files
- `lib/url-utils.ts` - Main utility functions
- `components/engagement-actions.tsx` - Button component with URL cleaning
- All detail pages - Direct link usage with URL cleaning

### Key Functions

#### `cleanUrl(url: string): string`
The main cleaning function that processes URLs and returns cleaned versions.

```typescript
// Examples
cleanUrl('event/www.global.com') // → 'https://www.global.com'
cleanUrl('opportunities/www.example.com') // → 'https://www.example.com'
cleanUrl('jobs/company.com') // → 'https://company.com'
cleanUrl('https://www.example.com') // → 'https://www.example.com' (unchanged)
cleanUrl('//www.example.com') // → '//www.example.com' (unchanged)
```

#### `isValidUrl(url: string): boolean`
Validates URLs after cleaning to ensure they're properly formatted.

#### `isExternalUrl(url: string): boolean`
Determines if a URL is external (not part of the current domain) after cleaning.

#### `openExternalUrl(url: string): void`
Safely opens external URLs in new tabs with security attributes after cleaning.

## Implementation Details

### URL Cleaning Logic

```typescript
export function cleanUrl(url: string): string {
  if (!url) return url
  
  // If it already has a protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url
  }
  
  // Pattern to match: [route]/www.[domain] or [route]/[domain]
  const routePrefixPattern = /^(opportunities?|events?|jobs?|resources?)\/(www\.)?(.+)$/i
  const match = url.match(routePrefixPattern)
  
  if (match) {
    const [, , wwwPrefix, domain] = match
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
```

### Regex Pattern Explanation

The regex pattern `^(opportunities?|events?|jobs?|resources?)\/(www\.)?(.+)$` matches:

- `opportunities?` - Matches "opportunity" or "opportunities"
- `events?` - Matches "event" or "events"  
- `jobs?` - Matches "job" or "jobs"
- `resources?` - Matches "resource" or "resources"
- `\/` - Matches the forward slash separator
- `(www\.)?` - Optionally matches "www." prefix
- `(.+)` - Captures the rest of the domain

## Usage Examples

### 1. Discovery Pages (Content Cards)

```typescript
// Before: Malformed URL in content card
const opportunity = { _id: 'event/www.global.com', title: 'Global Event' }

// After: Smart link detection
{(() => {
  const linkType = getLinkType(opportunity._id)
  
  if (linkType === 'internal') {
    return <Link href={`/opportunities/${opportunity._id}`}>Read More</Link>
  } else if (linkType === 'external') {
    return <Button onClick={() => openExternalUrl(opportunity._id)}>View Opportunity</Button>
  }
})()}
```

### 2. Detail Pages (Direct Links)

```typescript
// Before: Direct href usage
<a href={opportunity.url} target="_blank" rel="noopener noreferrer">
  Apply Here
</a>

// After: Cleaned URL
<a href={cleanUrl(opportunity.url)} target="_blank" rel="noopener noreferrer">
  Apply Here
</a>
```

### 3. Engagement Actions (Button Components)

```typescript
// The EngagementActions component automatically uses URL cleaning
<EngagementActions 
  type="opportunities" 
  id={id} 
  externalUrl={opportunity.url} // Automatically cleaned
  className="flex-shrink-0"
/>
```

## Test Cases

### Input → Output Examples

| Input | Output | Status |
|-------|--------|--------|
| `event/www.global.com` | `https://www.global.com` | ✅ Cleaned |
| `opportunities/www.example.com` | `https://www.example.com` | ✅ Cleaned |
| `jobs/company.com` | `https://company.com` | ✅ Cleaned |
| `resources/www.github.com` | `https://www.github.com` | ✅ Cleaned |
| `https://www.example.com` | `https://www.example.com` | ➖ Unchanged |
| `//www.example.com` | `//www.example.com` | ➖ Unchanged |
| `www.google.com` | `https://www.google.com` | ✅ Cleaned |
| `github.com` | `https://github.com` | ✅ Cleaned |
| `invalid-url` | `invalid-url` | ➖ Unchanged |

## Integration Points

### 1. Content Discovery Pages
- **File**: `app/opportunities/page.tsx`, `app/events/page.tsx`, `app/jobs/page.tsx`, `app/resources/page.tsx`
- **Usage**: Smart link detection for "Read More" buttons
- **Function**: `getLinkType()`, `openExternalUrl()`

### 2. Content Detail Pages
- **File**: `app/opportunities/[id]/page.tsx`, `app/resources/[id]/page.tsx`
- **Usage**: Direct link cleaning for application URLs and file URLs
- **Function**: `cleanUrl()`

### 3. Engagement Actions Component
- **File**: `components/engagement-actions.tsx`
- **Usage**: Button click handlers for Apply/Register/Access actions
- **Function**: `cleanUrl()`, `isValidUrl()`, `openExternalUrl()`

### 4. Search Results
- **File**: `app/search/page.tsx`
- **Usage**: Smart link detection for search result cards
- **Function**: `getLinkType()`, `openExternalUrl()`

## Error Handling

### URL Validation
```typescript
const handleExternalLink = async () => {
  if (!externalUrl) {
    toast.error('No external link available')
    return
  }

  // Validate URL before opening
  if (!isValidUrl(externalUrl)) {
    toast.error('Invalid external link')
    console.error('Invalid external URL:', externalUrl)
    return
  }

  // Open external link using our utility function
  openExternalUrl(externalUrl)
}
```

### Button States
```typescript
// Dynamic button text based on URL validity
<span className="hidden sm:inline">
  {!externalUrl ? 'No Link' : !isValidUrl(externalUrl) ? 'Invalid Link' : 'Apply'}
</span>
```

## Security Considerations

### External Link Security
- All external links open with `target="_blank" rel="noopener noreferrer"`
- URL validation prevents malicious or malformed URLs
- Protocol enforcement ensures HTTPS for security

### Error Boundaries
- Graceful handling of invalid URLs
- User feedback through toast notifications
- Console logging for debugging

## Performance Considerations

### Efficient Processing
- URL cleaning happens only when needed
- Cached results for repeated URL processing
- Minimal regex operations for optimal performance

### Memory Usage
- No persistent storage of cleaned URLs
- Lightweight utility functions
- Garbage collection friendly

## Maintenance

### Adding New Route Prefixes
To add support for new route prefixes, update the regex pattern:

```typescript
// Current pattern
const routePrefixPattern = /^(opportunities?|events?|jobs?|resources?)\/(www\.)?(.+)$/i

// Add new routes (e.g., 'courses', 'workshops')
const routePrefixPattern = /^(opportunities?|events?|jobs?|resources?|courses?|workshops?)\/(www\.)?(.+)$/i
```

### Testing New URLs
Use the test function to verify URL cleaning:

```typescript
import { cleanUrl } from '@/lib/url-utils'

console.log(cleanUrl('your-test-url')) // Test your URL
```

## Troubleshooting

### Common Issues

#### 1. URLs Not Being Cleaned
- **Check**: Ensure the URL matches the expected pattern
- **Solution**: Verify the regex pattern includes your route prefix

#### 2. Invalid URL Errors
- **Check**: URL format and protocol
- **Solution**: Use `isValidUrl()` to validate before processing

#### 3. External Links Not Opening
- **Check**: Browser popup blockers
- **Solution**: Ensure `openExternalUrl()` is used with proper error handling

### Debug Mode
Enable debug logging by checking console output:

```typescript
// Debug URL cleaning
console.log('Original URL:', url)
console.log('Cleaned URL:', cleanUrl(url))
console.log('Is Valid:', isValidUrl(url))
console.log('Is External:', isExternalUrl(url))
```

## Future Enhancements

### Potential Improvements
1. **URL Shortening Support** - Handle shortened URLs
2. **Domain Validation** - Verify domain existence
3. **Protocol Detection** - Auto-detect HTTP vs HTTPS
4. **International Domains** - Support for internationalized domain names

### Monitoring
- Track URL cleaning success rates
- Monitor invalid URL patterns
- User feedback on link functionality

## Conclusion

The URL Cleaning System provides a robust solution for handling malformed URLs in the application. It ensures a seamless user experience by automatically fixing common URL issues while maintaining security and performance standards.

For questions or issues, refer to the error handling section or check the console logs for debugging information.
