# 🏠 Localhost Development Setup

## ✅ Reverted to Localhost Backend

Your application is now configured to use the localhost backend for development.

### 🔧 Configuration Updated

**Frontend Environment (`.env.local`):**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**Backend CORS (`.env`):**
```env
CORS_ORIGIN=http://localhost:3000
```

**Auth Client (`lib/auth-client.ts`):**
- Development: `http://localhost:3001/api/auth`
- Production: `https://glow-up-channel-backend-761979347865.europe-west1.run.app/api/auth`

### 🧪 Backend Test Results

✅ **All tests passed!**
- Health check: Working
- Opportunities: 10 found
- Events: 6 found  
- Jobs: 1 found
- Resources: 1 found

### 🚀 How to Run

**1. Start Backend:**
```bash
cd backend
npm start
```
Backend will run on: `http://localhost:3001`

**2. Start Frontend:**
```bash
npm run dev
```
Frontend will run on: `http://localhost:3000`

### 🔗 Available Endpoints

- **Health Check**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/docs
- **Opportunities**: http://localhost:3001/api/opportunities
- **Events**: http://localhost:3001/api/events
- **Jobs**: http://localhost:3001/api/jobs
- **Resources**: http://localhost:3001/api/resources

### 🎯 Ready for Development!

Your localhost setup is working perfectly. You can now:
- Develop and test locally
- Make changes to both frontend and backend
- Test all features without affecting production

When you're ready to deploy to production, just update the environment variables back to the production URLs.
