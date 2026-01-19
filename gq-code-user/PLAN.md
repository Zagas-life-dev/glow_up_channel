# QR Code User Profile Mini App - Implementation Plan

## 📋 Project Overview

A mini app that allows users to:
1. **Generate a unique QR code** for their profile
2. **Display their profile** when someone scans the QR code
3. **Allow visitors to save contact details** to their device

---

## 🎯 Core Features

### 1. **User Profile Display Page** (Public)
When someone scans a QR code, they see a page with:
- **Name** (from `users.firstName` + `users.lastName`)
- **Phone Number** (needs to be added to UserProfile)
- **Email** (from `users.email`)
- **Profile Picture** (needs to be added - `avatar_url` in UserProfile)
- **Short Bio** (needs to be added - `bio` in UserProfile)
- **"Save to Contacts" button** (saves all details to device contacts)

### 2. **User Dashboard** (Authenticated)
- View their QR code
- Download/Share QR code
- Customize profile display:
  - Upload/change profile picture
  - Edit bio
  - Edit phone number
  - Toggle visibility of fields

### 3. **Backend API Endpoints** (New)
- `GET /api/qrcode/profile/:userId` - Get public profile by userId (no auth required)
- `GET /api/qrcode/my-qrcode` - Get current user's QR code data (auth required)
- `PUT /api/qrcode/profile` - Update QR profile fields (bio, phone, avatar) (auth required)

---

## 🗄️ Database Schema Updates Needed

### UserProfile Collection - Add Fields:
```javascript
{
  // Existing fields...
  phoneNumber: String,        // NEW - for contact sharing
  bio: String,                // NEW - short bio (max 500 chars)
  avatarUrl: String,          // NEW - profile picture URL
  qrCodeEnabled: Boolean,     // NEW - toggle QR code visibility (default: true)
}
```

### Users Collection - No changes needed
- Already has: `email`, `firstName`, `lastName`

---

## 🏗️ Technical Architecture

### Frontend Structure (`gq-code-user/`)
```
gq-code-user/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing/redirect page
│   ├── profile/
│   │   └── [userId]/
│   │       └── page.tsx        # Public profile page (scanned QR)
│   └── dashboard/
│       └── qrcode/
│           └── page.tsx        # User's QR code management
├── components/
│   ├── qr-code-display.tsx     # QR code component
│   ├── profile-card.tsx         # Profile display card
│   ├── save-contact-button.tsx # Save to contacts functionality
│   └── profile-editor.tsx      # Edit profile form
├── lib/
│   ├── qrcode-api.ts           # API client for QR endpoints
│   └── vcard-generator.ts      # Generate vCard for contacts
└── package.json                # Dependencies
```

### Backend Structure (in `latest-glowup-channel/`)
```
latest-glowup-channel/src/
├── routes/
│   └── qrcode.js               # NEW - QR code routes
├── controllers/
│   └── qrcodeController.js     # NEW - QR code logic
└── models/
    └── UserProfile.js          # UPDATE - Add new fields
```

---

## 🔧 Implementation Steps

### Phase 1: Backend Setup
1. ✅ Update `UserProfile` model to include:
   - `phoneNumber` (optional)
   - `bio` (optional, max 500 chars)
   - `avatarUrl` (optional)
   - `qrCodeEnabled` (default: true)

2. ✅ Create new API routes:
   - `GET /api/qrcode/profile/:userId` - Public profile endpoint
   - `GET /api/qrcode/my-qrcode` - Get user's QR code URL
   - `PUT /api/qrcode/profile` - Update QR profile fields

3. ✅ Create `qrcodeController.js` with:
   - `getPublicProfile(userId)` - Returns public profile data
   - `getMyQRCode()` - Returns QR code URL for authenticated user
   - `updateQRProfile()` - Updates bio, phone, avatar

### Phase 2: Frontend - Public Profile Page
1. ✅ Create `/profile/[userId]/page.tsx`:
   - Fetch public profile from API
   - Display profile card with all info
   - Implement "Save to Contacts" button
   - Handle loading/error states

2. ✅ Create `save-contact-button.tsx`:
   - Generate vCard format
   - Use Web Share API or download vCard file
   - Support mobile and desktop

3. ✅ Create `profile-card.tsx`:
   - Beautiful profile display component
   - Show avatar, name, email, phone, bio
   - Responsive design

### Phase 3: Frontend - User Dashboard
1. ✅ Create `/dashboard/qrcode/page.tsx`:
   - Display user's QR code
   - Show QR code URL
   - Download/share options

2. ✅ Create `profile-editor.tsx`:
   - Form to edit bio, phone, avatar
   - Image upload for avatar
   - Save changes

3. ✅ Create `qr-code-display.tsx`:
   - Generate QR code using library (qrcode.react or similar)
   - Display with download/share buttons

### Phase 4: QR Code Generation
1. ✅ Generate unique QR code URL format:
   - `https://yourdomain.com/profile/{userId}`
   - Or shorter: `https://yourdomain.com/p/{userId}`

2. ✅ Use QR code library:
   - `qrcode.react` or `react-qr-code` for frontend
   - Or generate on backend and serve as image

---

## 📦 Dependencies Needed

### Frontend (`gq-code-user/package.json`)
```json
{
  "dependencies": {
    "next": "^15.2.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "qrcode.react": "^3.1.0",        // QR code generation
    "vcard-json": "^0.1.0",          // vCard generation (or custom)
    // ... existing dependencies
  }
}
```

### Backend (already has what we need)
- MongoDB connection ✅
- Express routes ✅
- Authentication middleware ✅

---

## 🎨 UI/UX Considerations

### Public Profile Page
- Clean, modern design
- Mobile-first responsive
- Large, scannable QR code display
- Prominent "Save to Contacts" button
- Profile picture prominently displayed

### User Dashboard
- QR code preview
- Easy download/share options
- Inline profile editing
- Real-time preview of changes

---

## 🔒 Security & Privacy

1. **Public Profile Endpoint**:
   - No authentication required
   - Only returns public fields (name, email, phone, bio, avatar)
   - Respects `qrCodeEnabled` flag

2. **Profile Updates**:
   - Requires authentication
   - User can only update their own profile
   - Validate phone number format
   - Validate bio length

3. **QR Code URLs**:
   - Use userId (not sensitive)
   - Consider adding optional password protection later

---

## 📱 "Save to Contacts" Implementation

### Approach 1: vCard Download (Universal)
- Generate `.vcf` file with contact details
- User downloads and opens with contacts app
- Works on all devices

### Approach 2: Web Share API (Mobile)
- Use native share functionality
- Better UX on mobile devices
- Falls back to vCard download

### vCard Format:
```
BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
EMAIL:john@example.com
TEL:+1234567890
PHOTO;VALUE=URL:https://example.com/avatar.jpg
NOTE:Short bio text here
END:VCARD
```

---

## ✅ Success Criteria

1. ✅ User can generate and view their QR code
2. ✅ Scanning QR code shows public profile page
3. ✅ Profile page displays all required information
4. ✅ "Save to Contacts" button works on mobile and desktop
5. ✅ User can customize their profile (bio, phone, avatar)
6. ✅ Changes reflect immediately on public profile
7. ✅ Responsive design works on all devices

---

## 🚀 Next Steps After Approval

1. Start with backend model updates
2. Create API endpoints
3. Build public profile page
4. Implement save to contacts
5. Build user dashboard
6. Add QR code generation
7. Testing and refinement

---

## ❓ Questions to Clarify

1. **QR Code URL Format**: 
   - Use full domain or short URL?
   - Custom domain or subdomain?

2. **Profile Picture Storage**:
   - Use existing Cloudinary setup?
   - Or new storage solution?

3. **Phone Number**:
   - Required or optional?
   - International format validation?

4. **Bio Length**:
   - Maximum character limit? (suggest 500)

5. **Privacy**:
   - Can users disable QR code? (qrCodeEnabled flag)
   - Should we track scan analytics?

---

**Ready to proceed?** Let me know if this plan aligns with your vision, and I'll start building! 🚀



























