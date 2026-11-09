# 🏗️ Glow Up Channel - Comprehensive Architecture Analysis

## 📋 Executive Summary

**Glow Up Channel** is a full-stack social platform connecting young professionals to opportunities, events, jobs, and resources. The platform features a sophisticated recommendation engine, social networking capabilities, content monetization, and personalized feeds.

**Technology Stack:**
- **Frontend**: Next.js 16.1.4 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + MongoDB Atlas
- **Authentication**: JWT with bcrypt
- **File Storage**: Cloudinary
- **Deployment**: Vercel (Frontend) + Google Cloud Run (Backend)

---

## 🎨 Frontend Architecture

### **Framework & Structure**

#### **Next.js App Router Structure**
```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Homepage
├── globals.css                   # Global styles (Tailwind)
├── dashboard/                    # Protected dashboard routes
│   ├── page.tsx                 # Main dashboard (role-based)
│   ├── provider/                # Provider-specific pages
│   ├── admin/                   # Admin pages
│   ├── analytics/               # User analytics
│   ├── posting/                 # Content creation
│   ├── resources/               # Saved resources
│   └── settings/                # User settings
├── opportunities/               # Public opportunity listings
├── events/                      # Event listings
├── jobs/                        # Job listings
├── resources/                   # Resource library
├── community/                   # Social feed
├── posts/                       # Individual post pages
├── playlists/                   # User playlists
├── profile/                     # User profiles
├── search/                      # Search results
└── api/                         # Next.js API routes (email, newsletter)
```

#### **Key Frontend Technologies**
- **UI Framework**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom dark theme
- **State Management**: React Context API
  - `AuthProvider` - Authentication state
  - `PageProvider` - Page-level state
  - `PlaylistProvider` - Playlist management
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)
- **Analytics**: Vercel Analytics

### **Component Architecture**

#### **Core Components**
```
components/
├── ui/                          # shadcn/ui base components (40+ components)
├── app-layout.tsx              # Main app wrapper
├── app-sidebar.tsx             # Navigation sidebar
├── app-top-bar.tsx             # Top navigation bar
├── app-bottom-nav.tsx          # Mobile bottom navigation
├── feed-card.tsx               # Feed item display
├── post-card.tsx               # Social post display
├── post-composer.tsx           # Create/edit posts
├── playlist-modal.tsx          # Playlist management
├── edit-profile-modal.tsx      # Profile editing
├── resource-media-player.tsx   # Media player (video/audio/PDF)
├── enhanced-search.tsx         # Advanced search
└── forms/                      # Form components
```

#### **Key Features**
1. **Dark Theme**: Forced dark mode with orange accent colors
2. **Responsive Design**: Mobile-first with breakpoints (xs, sm, md, lg, xl, 2xl)
3. **Accessibility**: ARIA labels, keyboard navigation, focus management
4. **Performance**: Image optimization, lazy loading, code splitting

### **API Integration**

#### **API Client** (`lib/api-client.ts`)
- Centralized API client with automatic token management
- JWT token refresh handling
- Error handling and retry logic
- TypeScript interfaces for all endpoints

**Key Methods:**
- `login()`, `register()`, `logout()`
- `getOpportunities()`, `getEvents()`, `getJobs()`, `getResources()`
- `getRecommendations()`, `getPersonalizedFeed()`
- `createPost()`, `likePost()`, `bookmarkPost()`, `repostPost()`
- `createPlaylist()`, `saveToPlaylist()`
- `followUser()`, `getConnections()`
- `getAnalytics()`, `getUserProfile()`

### **Authentication Flow**

1. **Login/Signup**: JWT tokens stored in localStorage
2. **Token Refresh**: Automatic refresh on 401 errors
3. **Protected Routes**: `useRequireAuth()` hook
4. **Role-Based Access**: Different dashboards for seekers/providers/admins

---

## ⚙️ Backend Architecture

### **Server Structure** (`latest-glowup-channel/`)

#### **Entry Point** (`server.js`)
- Express.js server on port 8080
- CORS enabled for all origins
- Security middleware (Helmet, rate limiting, mongo-sanitize)
- Swagger API documentation at `/docs`
- Graceful shutdown handling

#### **Directory Structure**
```
latest-glowup-channel/
├── server.js                    # Entry point
├── src/
│   ├── config/                 # Configuration
│   │   ├── database.js        # MongoDB connection
│   │   ├── cloudinary.js      # File upload config
│   │   ├── constants.js       # App constants
│   │   └── swagger.js         # API docs
│   ├── models/                # Data models (20+ models)
│   ├── controllers/           # Request handlers (30+ controllers)
│   ├── routes/                # API routes (30+ route files)
│   ├── middleware/            # Auth, validation, upload
│   ├── services/              # Business logic (15+ services)
│   └── utils/                 # Utilities (JWT, password hashing)
├── migrations/                # Database migrations
└── scripts/                   # Utility scripts
```

### **Database Architecture**

#### **MongoDB Atlas Connection**
- Cloud-based MongoDB (no local database)
- Connection pooling with retry logic
- Automatic index creation
- Health check endpoints

#### **Core Collections**

1. **users** - User accounts and authentication
2. **user_profiles** - Extended user profile data
3. **user_preferences** - User preferences for recommendations
4. **opportunities** - Opportunity listings
5. **events** - Event listings
6. **jobs** - Job postings
7. **resources** - Educational resources
8. **posts** - Social media posts
9. **post_engagements** - Centralized engagement tracking
10. **replies** - Post replies/comments
11. **playlists** - User-created content collections
12. **connections** - User follow/follower relationships
13. **notifications** - User notifications
14. **hashtags** - Hashtag registry (unified with skills)
15. **user_hashtag_affinity** - Hashtag preference scores
16. **saved_items** - User saved content
17. **engagements** - User engagement history
18. **promotions** - Paid content promotions
19. **payments** - Payment records
20. **popular_items** - Trending content tracking

### **Authentication System**

#### **JWT Implementation**
- **Access Token**: 7-day expiration (configurable)
- **Refresh Token**: Longer expiration
- **Token Generation**: `src/utils/jwt.js`
- **Middleware**: `src/middleware/auth.js`

#### **Auth Middleware Functions**
- `authenticateToken` - Required auth
- `optionalAuth` - Optional auth (sets req.user if valid)
- `requireRole(...roles)` - Role-based access
- `requireAdmin` - Admin-only access
- `requireSuperAdmin` - Super admin access
- `canApprove` - Approval permissions

#### **User Roles**
- `opportunity_seeker` - Default role, auto-approved
- `opportunity_poster` - Requires admin approval
- `admin` - Content moderation, user management
- `super_admin` - Full system access

### **API Routes**

#### **Authentication** (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset

#### **Content Routes**
- `/api/opportunities` - CRUD operations
- `/api/events` - Event management
- `/api/jobs` - Job postings
- `/api/resources` - Resource library
- `/api/posts` - Social posts
- `/api/replies` - Post replies
- `/api/playlists` - Playlist management

#### **Social Features**
- `/api/connections` - Follow/unfollow users
- `/api/notifications` - User notifications
- `/api/engagement` - Like, bookmark, repost

#### **Recommendations**
- `/api/recommended` - Personalized recommendations
- `/api/feed` - Personalized feed (posts)

#### **Monetization**
- `/api/promotions` - Content promotion packages
- `/api/payments` - Payment processing
- `/api/admin/promotions` - Admin promotion management

#### **Analytics**
- `/api/analytics` - User and platform analytics

### **Services Layer**

#### **RecommendationService** (`src/services/recommendationService.js`)
**Algorithm**: 70/30 split (70% personalized, 30% popular)

**Scoring Components:**
1. **Profile Match (40%)** - Interests, skills, location, career stage
2. **Engagement History (30%)** - Past saves, likes, clicks
3. **Recency (15%)** - Fresh content priority
4. **Popularity (10%)** - Trending content
5. **Location Match (5%)** - Geographic relevance

**Features:**
- Quick sort algorithm for performance
- Fallback recommendations for new users
- Promotion integration (paid content boost)
- Multi-content type support (opportunities, events, jobs, resources)

#### **FeedAlgorithmService** (`src/services/feedAlgorithmService.js`)
**Personalized Feed Algorithm** for social posts

**Scoring Components:**
1. **Engagement History (25%)** - Posts similar to liked/saved content
2. **Profile Match (22%)** - User interests, skills, location
3. **Post Performance (8%)** - Likes, replies, reposts
4. **Hashtag Affinity (10%)** - Hashtag preference scores
5. **Recency (12%)** - Fresh content
6. **Author Relationship (8%)** - Following/connections
7. **Playlist Match (5%)** - Saved playlist relevance
8. **Content Reference (5%)** - Embedded opportunity/event/job relevance
9. **Saved Items Match (5%)** - Similar to saved content

**Dynamic Weighting:**
- New users (< 50 engagements): More profile match, less engagement history
- Experienced users: More engagement history, less popularity

**Vector Embeddings:**
- Cosine similarity for semantic matching
- Embedding-based content similarity

#### **HashtagAffinityService** (`src/services/hashtagAffinityService.js`)
- Tracks user affinity for hashtags based on engagements
- Updates scores on like, save, repost, reply
- Used in feed and recommendation algorithms

#### **PromotionService** (`src/services/promotionService.js`)
- Manages paid content promotions
- Integrates promotions into recommendations
- Handles promotion expiry and rotation

#### **Other Services**
- `emailVerificationService` - Email verification
- `passwordResetService` - Password reset flow
- `analyticsService` - Analytics aggregation
- `rotationService` - Content rotation for promotions
- `promotionExpiryService` - Automatic promotion expiry
- `pastPostsService` - Archive old posts
- `embeddingService` - Generate content embeddings

### **Data Models**

#### **User Model** (`src/models/User.js`)
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String, // 'opportunity_seeker', 'opportunity_poster', 'admin', 'super_admin'
  status: String, // 'pending', 'approved', 'rejected'
  isActive: Boolean,
  emailVerified: Boolean,
  profileImage: String (Cloudinary URL),
  bio: String,
  headline: String,
  skills: [String],
  work: { company, title },
  education: { school, degree, field },
  socialLinks: { linkedin, twitter, instagram, github },
  isPrivate: Boolean,
  bookmarkedPosts: [ObjectId],
  savedPlaylists: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

#### **Post Model** (`src/models/Post.js`)
```javascript
{
  _id: ObjectId,
  author: { _id, email, firstName, profileImage },
  content: {
    text: String,
    images: [String], // Cloudinary URLs (max 5)
    playlist: { _id, name, description, items },
    contentReference: { type, contentId, title, description },
    poll: { question, options: [{ text, votes }], endDate }
  },
  hashtags: [String],
  mentions: [{ userId, username }],
  visibility: String, // 'public' or 'private'
  likes: [ObjectId],
  likeCount: Number,
  replyCount: Number,
  repostCount: Number,
  bookmarkCount: Number,
  isRepost: Boolean,
  originalPost: ObjectId,
  repostedBy: { _id, email, firstName },
  embedding: [Number], // Vector embedding for semantic search
  createdAt: Date,
  updatedAt: Date,
  isDeleted: Boolean
}
```

#### **PostEngagement Model** (`src/models/PostEngagement.js`)
Centralized engagement tracking:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  postId: ObjectId,
  action: String, // 'like', 'bookmark', 'repost', 'reply', 'vote'
  createdAt: Date,
  metadata: {
    optionIndex: Number, // for votes
    replyId: ObjectId, // for replies
    repostId: ObjectId // for reposts
  }
}
```

#### **Hashtag Model** (`src/models/Hashtag.js`)
Unified hashtag/skill registry:
```javascript
{
  _id: ObjectId,
  name: String (lowercase, unique),
  displayName: String,
  type: String, // 'hashtag', 'skill', 'both'
  usageCount: Number,
  skillUsageCount: Number,
  lastUsed: Date,
  categories: [String],
  synonyms: [String]
}
```

### **Security Features**

1. **Password Security**
   - bcrypt hashing with salt
   - Password strength validation

2. **JWT Security**
   - Secure token generation
   - Token expiration
   - Refresh token rotation

3. **API Security**
   - Rate limiting (100 requests per 15 minutes)
   - CORS configuration
   - Helmet.js security headers
   - MongoDB injection prevention (mongo-sanitize)
   - XSS protection

4. **File Upload Security**
   - Cloudinary integration
   - File type validation
   - Size limits (10MB)

---

## 🔄 Data Flow

### **User Registration Flow**
1. User submits registration form
2. Frontend calls `POST /api/auth/register`
3. Backend validates data, hashes password
4. User created with `status: 'pending'` (if provider) or `'approved'` (if seeker)
5. Email verification sent (if enabled)
6. JWT tokens returned
7. Frontend stores tokens, redirects to onboarding

### **Content Recommendation Flow**
1. User requests recommendations
2. Frontend calls `GET /api/recommended`
3. Backend `RecommendationService`:
   - Fetches user profile and preferences
   - Retrieves all active content (opportunities, events, jobs, resources)
   - Calculates scores for each item
   - Integrates promotions (paid boost)
   - Sorts by score (quick sort)
   - Returns top recommendations
4. Frontend displays personalized feed

### **Social Feed Flow**
1. User requests feed
2. Frontend calls `GET /api/posts/feed`
3. Backend `FeedAlgorithmService`:
   - Fetches user profile, engagements, hashtag affinity
   - Retrieves posts (with pagination)
   - Calculates personalized scores
   - Sorts by score
   - Returns top posts
4. Frontend displays feed with infinite scroll

### **Post Engagement Flow**
1. User likes/bookmarks/reposts a post
2. Frontend calls `POST /api/engagement`
3. Backend:
   - Creates `PostEngagement` document
   - Updates post counters
   - Updates hashtag affinity scores
   - Creates notification (if applicable)
4. Frontend updates UI optimistically

---

## 🎯 Key Features

### **1. Personalized Recommendations**
- Multi-factor scoring algorithm
- Real-time preference learning
- Promotion integration
- Fallback for new users

### **2. Social Networking**
- Follow/unfollow users
- Post creation with images, hashtags, mentions
- Replies and conversations
- Reposts and bookmarks
- Playlists (content collections)

### **3. Content Management**
- Opportunities, Events, Jobs, Resources
- Rich media support (images, videos, documents)
- Content promotion packages
- Analytics and insights

### **4. Monetization**
- Paid content promotion
- Payment processing
- Receipt generation
- Promotion expiry management

### **5. Analytics**
- User engagement tracking
- Content performance metrics
- Platform-wide analytics
- Provider-specific insights

### **6. Search & Discovery**
- Full-text search
- Hashtag-based discovery
- Filtering and sorting
- Semantic search (vector embeddings)

---

## 📊 Performance Optimizations

### **Frontend**
- Next.js App Router for code splitting
- Image optimization
- Lazy loading components
- Memoization for expensive computations
- Optimistic UI updates

### **Backend**
- Database indexing (20+ indexes)
- Connection pooling
- Quick sort for recommendations
- Pagination for large datasets
- Caching strategies (where applicable)

### **Database**
- Essential indexes on frequently queried fields
- Compound indexes for complex queries
- Vector index for semantic search (Atlas Search)

---

## 🔧 Development & Deployment

### **Environment Variables**

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

**Backend** (`.env`):
```env
MONGODB_URI=mongodb+srv://...
DB_NAME=glowup-channel
JWT_SECRET=...
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
PORT=8080
```

### **Deployment**

**Frontend**: Vercel
- Automatic deployments from Git
- Environment variables in Vercel dashboard
- Edge functions for API routes

**Backend**: Google Cloud Run
- Docker containerization
- Cloud Build for CI/CD
- Environment variables in Cloud Run
- Auto-scaling based on traffic

### **Database**: MongoDB Atlas
- Cloud-hosted MongoDB
- Automatic backups
- Monitoring and alerts
- Connection string in environment variables

---

## 📝 API Documentation

Swagger documentation available at:
- Development: `http://localhost:8080/docs`
- Production: `https://your-backend-url/docs`

---

## 🚀 Future Enhancements

1. **Real-time Features**
   - WebSocket for live notifications
   - Real-time chat
   - Live feed updates

2. **Advanced Analytics**
   - Machine learning for better recommendations
   - Predictive analytics
   - A/B testing framework

3. **Mobile App**
   - React Native app
   - Push notifications
   - Offline support

4. **Content Moderation**
   - AI-powered content filtering
   - Automated spam detection
   - Community reporting system

---

## 📚 Additional Resources

- `SYSTEM_ARCHITECTURE.md` - Detailed system architecture
- `FRONTEND_BACKEND_SETUP.md` - Setup instructions
- `DEPLOYMENT_GUIDE.md` - Deployment guide
- `TECHNICAL_IMPLEMENTATION.md` - Technical details
- `README_Final_ver.md` - Project overview

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintainer**: Glow Up Channel Team
