# ��� Glow Up Channel - Development Documentation

## ��� Project Overview

**Glow Up Channel** is a comprehensive platform connecting young ambitious people to opportunities, events, jobs, and resources that accelerate personal and professional growth. This is a **production-ready v1** built with modern technologies and designed for scalability.

### ��� Core Purpose
- **Opportunity Discovery**: Find internships, freelance work, scholarships, grants, and competitions
- **Event Management**: Networking events, workshops, conferences, and skill-building sessions  
- **Job Board**: Full-time, part-time, remote, and internship positions
- **Resource Library**: Educational materials, career guides, templates, and digital tools
- **Personalized Recommendations**: AI-driven content discovery using 70/30 algorithm split
- **User Engagement**: Save, like, and track content with comprehensive analytics

### ��� Target Users
- **Opportunity Seekers**: Students, graduates, career changers
- **Opportunity Providers**: Companies, organizations, individuals
---

## ���️ Technical Architecture

### **Frontend Stack**
- **Framework**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks + Context API
- **Authentication**: Better-Auth integration
- **Deployment**: Vercel (production)

### **Backend Stack**
- **Runtime**: Node.js 18+ + Express.js
- **Database**: **MongoDB Atlas** (Cloud Service) - **NO LOCAL DATABASE**
- **Authentication**: JWT 
- **File Storage**: Cloudinary for media uploads

**MongoDB Connection String**:
```
mongodb+srv://admin_db_user:QpAHY8MwWdvHfx0u@glowup-channel.vhcmgft.mongodb.net/?retryWrites=true&w=majority&appName=glowup-channel
```

**Required MongoDB Package**:
```bash
npm install mongodb
```

### **Real-Time Learning**
- **Preference Updates**: System learns from saves, likes, and click-throughs
- **Engagement Tracking**: Every user interaction updates recommendation weights
- **Behavioral Analysis**: Search patterns and filter usage influence recommendations

---

## ��� User Onboarding System


- **Country** (required)
- **Province/State** (required) 
- **City/Town** (optional)
- **Career Stage** (required):
  - Student
  - Entry-Level (0-2 years)
  - Mid-Career (3-7 years)
  - Senior/Executive (8+ years)
- **Interests** (multi-select, required):
  - Jobs & Career Opportunities
  - Scholarships & Grants
  - Training & Workshops
  - Networking Events
  - Volunteering & Community Service
  - Entrepreneurship & Funding
  - Remote Work & Digital Skills
- **Industry Sectors** (multi-select, required):
  - Technology
  - Creative Arts & Media
  - Business & Finance
  - Healthcare & Sciences
  - Education & Training
  - Government & Public Service
- **Education Level**: High School, Undergraduate, Graduate, Professional
- **Field of Study**: Technology, Business, Arts, Sciences, etc.
- **Institution**: University/College name
- **Skills**: Web Development, Digital Marketing, Project Management, etc.
- **Aspirations** (multi-select):
  - Access to career opportunities
  - Mentorship & guidance
  - Networking & professional connections
  - Skill development
  - Entrepreneurship support

### **Onboarding Data Storage**
All onboarding data is stored in `user_profiles` and `user_preferences` collections in MongoDB, used for:
- Personalized recommendations
- Content filtering
- Analytics and insights
- User experience optimization

---

## ��� Save & Like System

### **Engagement Tracking**

#### **Save Functionality**
- **Purpose**: Bookmark content for later reference
- **Storage**: `saved_items` collection
- **Features**:
  - Add personal notes to saved items
  - Organize by content type (opportunity, event, job, resource)
  - Quick access from user dashboard
  - Export saved items

#### **Like Functionality**
- **Purpose**: Express appreciation and improve recommendations
- **Storage**: `likes` collection
- **Features**:
  - One-click like/unlike
  - Public like counts


#### **Engagement Analytics**
- **View Tracking**: Every page visit is recorded
- **Click-Through Tracking**: External link clicks with time spent
- **User Agent & Location**: For analytics and personalization
- **Engagement History**: Complete user behavior tracking

---

## ��� Development Setup

### **Prerequisites**
- Node.js 18+ and npm/pnpm
- MongoDB Atlas account (cloud service)
- Git and GitHub account
- Redis Cloud account (for caching)

### **Environment Setup**

1. **Clone Repository**
```bash
git clone [your-repo-url]
cd Glowup-diaries-main
```

2. **Install Dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
```



## ��� Analytics & Monitoring

### **User Engagement Tracking**
- **Page Views**: Every content page visit
- **Save Actions**: Bookmark tracking with timestamps
- **Like Actions**: Social engagement metrics
- **Click-Throughs**: External link tracking with time spent
- **Search Queries**: User search behavior analysis
- **Filter Usage**: How users narrow down content

### **Content Performance**
- **View Counts**: Content popularity metrics
- **Engagement Rates**: Save/like ratios
- **Click-Through Rates**: External link performance
- **Time on Page**: User engagement duration
- **Conversion Tracking**: Application/registration rates

### **Platform Analytics**
- **User Growth**: Registration and retention metrics
- **Content Volume**: Opportunities, events, jobs, resources
- **Geographic Distribution**: User location analytics
- **Device/Browser Stats**: Technical usage patterns

---

## ��� Security & Performance

### **Security Measures**
- **Authentication**: Better-Auth with JWT tokens
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Express-validator with custom rules
- **CORS Configuration**: Cross-origin request handling
- **Helmet**: Security headers
- **Input Sanitization**: XSS protection

### **Performance Optimizations**
- **Database Indexing**: MongoDB indexes for fast queries
- **Connection Pooling**: Database connection optimization
- **CDN**: Static asset delivery
- **Image Optimization**: Next.js automatic optimization
- **Code Splitting**: Lazy loading for better performance

---
