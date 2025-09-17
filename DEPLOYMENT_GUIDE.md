# 🚀 Deployment Guide

## Backend Deployment (Google Cloud Run)

Your backend is already deployed at:
**https://glow-up-channel-backend-761979347865.europe-west1.run.app**

### ✅ What's Already Configured

1. **Frontend Environment** (`.env.local`):
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://glow-up-channel-backend-761979347865.europe-west1.run.app
   ```

2. **Backend CORS** (`.env`):
   ```env
   CORS_ORIGIN=https://glowup-diaries-main.vercel.app,http://localhost:3000
   ```

3. **Swagger Documentation**:
   - Production: https://glow-up-channel-backend-761979347865.europe-west1.run.app/docs
   - Health Check: https://glow-up-channel-backend-761979347865.europe-west1.run.app/health

## 🧪 Testing Your Backend

### Quick Test
```bash
node test-backend-connection.js
```

### Manual Testing
```bash
# Health check
curl https://glow-up-channel-backend-761979347865.europe-west1.run.app/health

# Test opportunities
curl https://glow-up-channel-backend-761979347865.europe-west1.run.app/api/opportunities

# Test events
curl https://glow-up-channel-backend-761979347865.europe-west1.run.app/api/events
```

## 🔧 Frontend Deployment

### Vercel Deployment
1. Push your changes to GitHub
2. Vercel will automatically deploy
3. Your frontend will be available at your Vercel URL

### Environment Variables
Make sure these are set in Vercel:
- `NEXT_PUBLIC_BACKEND_URL` = `https://glow-up-channel-backend-761979347865.europe-west1.run.app`
- `NEXT_PUBLIC_SUPABASE_URL` = `https://tvdqtadeojafitwhqyub.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-supabase-anon-key`

## 🗄️ Database Setup

### For New Database
```bash
cd backend
node run-migration.js init
```

This will:
- Create all necessary indexes
- Set up default categories and tags
- Verify database structure

## 🔍 Monitoring

### Backend Health
- **Health Check**: https://glow-up-channel-backend-761979347865.europe-west1.run.app/health
- **API Docs**: https://glow-up-channel-backend-761979347865.europe-west1.run.app/docs

### Common Issues

1. **CORS Errors**
   - Check if your frontend domain is in `CORS_ORIGIN`
   - Verify the backend is running

2. **Database Connection**
   - Check MongoDB Atlas connection
   - Verify database indexes are created

3. **Authentication Issues**
   - Check JWT secret configuration
   - Verify token expiration settings

## 📋 Next Steps

1. **Test the full flow**:
   - User registration
   - User login
   - Browse content
   - Test engagement features

2. **Monitor performance**:
   - Check response times
   - Monitor error rates
   - Review logs

3. **Set up monitoring**:
   - Google Cloud Monitoring
   - Error tracking
   - Performance metrics

## 🆘 Support

If you encounter issues:
1. Check the backend logs in Google Cloud Console
2. Test individual endpoints with curl
3. Verify environment variables
4. Check database connectivity

## 🎉 Success!

Your backend is now live and ready to serve your frontend application!

