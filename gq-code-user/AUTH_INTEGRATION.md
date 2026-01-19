# Authentication Integration Guide

## How Authentication Works

The QR code mini app receives authentication from the main Glowup Channel app in two ways:

### 1. URL Parameter (Primary Method)
When a user clicks "My QR Code" in the main dashboard:
- The main app gets the `accessToken` from localStorage
- Opens the mini app with the token as a URL parameter: `?token=...`
- The mini app extracts the token and stores it in localStorage

### 2. localStorage (Fallback)
If the user navigates directly to the mini app:
- The mini app checks localStorage for `accessToken` or `authToken`
- Uses the token if found

## Implementation Details

### Main App (`app/dashboard/page.tsx`)

The QR code button:
```typescript
<Button
  onClick={() => {
    const token = localStorage.getItem('accessToken');
    const qrCodeUrl = process.env.NEXT_PUBLIC_QR_CODE_URL || 'http://localhost:3001';
    const url = `${qrCodeUrl}/dashboard${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }}
>
  <QrCode className="h-4 w-4 mr-2" />
  My QR Code
</Button>
```

### Mini App (`gq-code-user/app/dashboard/page.tsx`)

Token extraction:
```typescript
const getAuthToken = () => {
  if (typeof window === 'undefined') return '';
  
  // First, check URL parameters (passed from main app)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    // Store in localStorage for future use
    localStorage.setItem('accessToken', tokenFromUrl);
    return tokenFromUrl;
  }
  
  // Fallback to localStorage
  return localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
};
```

## Environment Variables

### Main App
Add to `.env.local`:
```env
NEXT_PUBLIC_QR_CODE_URL=http://localhost:3001
```

For production:
```env
NEXT_PUBLIC_QR_CODE_URL=https://your-qr-code-domain.com
```

### Mini App
Already configured to use:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

## Security Considerations

1. **Token Transmission**: Tokens are passed via URL parameter, which is visible in:
   - Browser history
   - Server logs
   - Referrer headers

2. **Best Practices**:
   - Tokens are immediately stored in localStorage
   - URL is cleaned after token extraction (optional enhancement)
   - Tokens expire and are refreshed by the backend

3. **Future Enhancements**:
   - Use postMessage API for cross-origin communication
   - Implement token refresh mechanism
   - Add token expiration checks

## Testing

1. **From Main Dashboard**:
   - Log in to main app
   - Click "My QR Code" button
   - Mini app should open with authentication

2. **Direct Access**:
   - Navigate directly to mini app
   - If token exists in localStorage, it should work
   - Otherwise, shows error message

3. **Token Expiration**:
   - If token expires, user will see error
   - User needs to log in again from main app

## Troubleshooting

### "Please log in" error
- Check if token exists in localStorage
- Verify token is being passed in URL
- Check browser console for errors

### Token not working
- Token may have expired
- User needs to log in again from main app
- Check backend API is accessible

### CORS errors
- Ensure backend allows requests from mini app domain
- Check CORS configuration in backend



























