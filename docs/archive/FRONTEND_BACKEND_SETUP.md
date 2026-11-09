# Frontend-Backend Integration Setup Guide

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:3001`

### 2. Frontend Setup
```bash
npm install
npm run dev
```
The frontend will run on `http://localhost:3000`

### 3. Test Connection
```bash
node test-backend-connection.js
```

## 🔧 Configuration Changes Made

### Environment Variables
- Updated `.env.local` to use correct backend URL (`http://localhost:3001`)
- Backend configured to run on port 3001 (not 5000)

### Authentication System
- **Replaced Better-Auth with JWT-based authentication**
- Created new `AuthProvider` in `lib/auth-context.tsx`
- Updated all auth-related components to use new system

### API Client
- Created comprehensive `ApiClient` in `lib/api-client.ts`
- Handles all backend communication with proper error handling
- Includes automatic token refresh functionality

### Updated Components
- ✅ Login page (`app/login/page.tsx`)
- ✅ Signup page (`app/signup/page.tsx`)
- ✅ Onboarding page (`app/onboarding/page.tsx`)
- ✅ Opportunities page (`app/opportunities/page.tsx`)
- ✅ Jobs page (`app/jobs/page.tsx`)
- ✅ Resources pages (`app/resources/page.tsx`, `app/dashboard/resources/page.tsx`)
- ✅ Home page (`app/page.tsx`)

## 🔐 Authentication Flow

### User Registration
1. User fills signup form
2. Frontend calls `ApiClient.registerOpportunitySeeker()`
3. Backend creates user account (auto-approved)
4. JWT tokens stored in localStorage
5. User redirected to onboarding

### User Login
1. User enters email/password
2. Frontend calls `ApiClient.login()`
3. Backend validates credentials
4. JWT tokens returned and stored
5. User redirected to dashboard

### Protected Routes
- Uses `useRequireAuth()` hook
- Automatically redirects to login if not authenticated
- Handles token refresh automatically

## 📡 API Endpoints Used

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register/opportunity-seeker` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh tokens

### Content
- `GET /api/opportunities` - Get opportunities
- `GET /api/events` - Get events
- `GET /api/jobs` - Get jobs
- `GET /api/resources` - Get resources

### User Profile
- `POST /api/users/profile` - Create user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/profile` - Get user profile

### Engagement
- `POST /api/engagement/opportunities/:id/save` - Save opportunity
- `POST /api/engagement/opportunities/:id/like` - Like opportunity
- `POST /api/engagement/events/:id/register` - Register for event
- `POST /api/engagement/jobs/:id/apply` - Apply for job

## 🧪 Testing the Integration

### 1. Test Backend Health
```bash
curl http://localhost:3001/health
```

### 2. Test Public Endpoints
```bash
curl http://localhost:3001/api/opportunities
curl http://localhost:3001/api/events
curl http://localhost:3001/api/jobs
curl http://localhost:3001/api/resources
```

### 3. Test User Registration
```bash
curl -X POST http://localhost:3001/api/auth/register/opportunity-seeker \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

### 4. Test User Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Backend is configured to allow `http://localhost:3000`
   - Check if frontend is running on correct port

2. **Authentication Errors**
   - Check if JWT tokens are being stored in localStorage
   - Verify token format and expiration

3. **API Connection Errors**
   - Ensure backend is running on port 3001
   - Check MongoDB connection in backend logs

4. **Database Errors**
   - Verify MongoDB Atlas connection string
   - Check if database indexes are created

### Debug Steps

1. Check browser console for errors
2. Check backend logs for API calls
3. Verify environment variables
4. Test API endpoints directly with curl/Postman

## 📋 Next Steps

1. **Test User Flow**
   - Register new user
   - Complete onboarding
   - Browse opportunities/events/jobs
   - Test save/like functionality

2. **Add Error Handling**
   - Implement proper error messages
   - Add loading states
   - Handle network errors

3. **Enhance Features**
   - Add search functionality
   - Implement recommendations
   - Add user dashboard

4. **Production Setup**
   - Update environment variables
   - Configure production backend URL
   - Set up proper error monitoring

## 🔗 Key Files

- `lib/api-client.ts` - Main API client
- `lib/auth-context.tsx` - Authentication context
- `app/layout.tsx` - Updated to use new auth provider
- `.env.local` - Frontend environment variables
- `backend/.env` - Backend environment variables

## 📚 Documentation

- Backend API docs: `http://localhost:3001/docs`
- Backend health: `http://localhost:3001/health`
- Frontend: `http://localhost:3000`


