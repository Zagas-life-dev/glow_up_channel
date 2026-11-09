# Cleanup Services Overview

## Summary of All Cleanup Services

The backend has multiple cleanup services that maintain data integrity and content freshness. This document provides a comprehensive overview of all cleanup services, their schedules, and purposes.

---

## 1. Past Posts Service

**File:** `latest-glowup-channel/src/services/pastPostsService.js`

### Purpose
Moves expired opportunities, events, and jobs to "past" collections and marks them as inactive.

### Schedule
- **Frequency:** Every 5 hours
- **Cron Expression:** `'0 */5 * * *'`
- **Times:** 00:00, 05:00, 10:00, 15:00, 20:00
- **Timezone:** Africa/Lagos
- **Initial Run:** Yes (runs immediately on startup)

### What It Cleans
| Content Type | Expiry Criteria | Destination Collection |
|-------------|-----------------|------------------------|
| Opportunities | `dates.applicationDeadline < now` | `past_opportunities` |
| Events | `dates.endDate < now` | `past_events` |
| Jobs | `dates.applicationDeadline < now` | `past_jobs` |

### Actions Performed
1. Finds expired content (status: active, isApproved: true)
2. Copies to past collection with metadata
3. Updates original to:
   - `status: 'inactive'`
   - `isApproved: false`
   - `isValid: false`
   - `movedToPastAt: now`
   - `pastReason: '...'`

### Recent Updates
- Changed from daily (2 AM) to every 5 hours
- Added immediate startup run
- Enhanced result tracking
- Improved data integrity with additional field updates

---

## 2. Promotion Expiry Service

**File:** `latest-glowup-channel/src/services/promotionExpiryService.js`

### Purpose
Marks expired promotions as completed and monitors promotions expiring soon.

### Schedule
- **Frequency:** Every hour
- **Cron Expression:** `'0 * * * *'`
- **Times:** Every hour at minute 0
- **Timezone:** Africa/Lagos
- **Initial Run:** No explicit startup run

### What It Cleans
| Content Type | Expiry Criteria | Status Update |
|-------------|-----------------|---------------|
| Promotions | `endDate < now` and `status: 'active'` and `paymentStatus: 'paid'` | `status: 'completed'` |

### Actions Performed
1. Finds expired promotions
2. Updates status to 'completed'
3. Sets `completedAt` timestamp
4. Checks for promotions expiring within 24 hours (warning logs)

### Additional Features
- Manual expiration method
- Expiry statistics tracking
- Soon-to-expire notifications (logged)

---

## 3. Promotion Cleanup Service

**File:** `latest-glowup-channel/src/services/promotionCleanupService.js`

### Purpose
Static utility methods for promotion maintenance and cleanup.

### Schedule
Called by Promotion Expiry Service (not independently scheduled)

### Methods

#### `markExpiredPromotions()`
- Marks promotions with `endDate < now` as completed
- Returns counts of expired and updated promotions

#### `getPromotionStats()`
- Returns comprehensive promotion statistics
- Breaks down by status (active, pending, completed, cancelled)
- Calculates total investment amounts

#### `cleanupOldCompletedPromotions(daysOld = 90)`
- Deletes completed promotions older than specified days
- **Not scheduled by default** (manual execution only)
- Use for periodic database maintenance

#### `forceExpirePromotion(promotionId)`
- Manually expire a specific promotion
- Admin function

---

## 4. Rotation Service

**File:** `latest-glowup-channel/src/services/rotationService.js`

### Purpose
Manages content rotation and updates expired promotion statuses (partial overlap with Promotion Expiry Service).

### Schedule
Not a scheduled service - called on-demand

### Methods

#### `updateExpiredPromotions()`
- Updates promotions where `endDate < now`
- Sets status to 'expired' (different from 'completed')
- Returns count of updated promotions

**Note:** This method marks promotions as 'expired' while PromotionExpiryService marks them as 'completed'. Consider consolidating for consistency.

---

## Schedule Comparison

| Service | Frequency | When It Runs | Initial Startup Run |
|---------|-----------|--------------|---------------------|
| Past Posts | Every 5 hours | 00:00, 05:00, 10:00, 15:00, 20:00 | ✅ Yes |
| Promotion Expiry | Every hour | Every hour at :00 | ❌ No |
| Promotion Cleanup | On-demand | Called by Promotion Expiry | N/A |
| Rotation Service | On-demand | API requests | N/A |

---

## Service Initialization (server.js)

```javascript
const promotionExpiryService = require('./src/services/promotionExpiryService');
const pastPostsService = require('./src/services/pastPostsService');

// Start services after database connection
promotionExpiryService.start();
pastPostsService.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  promotionExpiryService.stop();
  pastPostsService.stop();
  await database.disconnect();
});
```

---

## Database Collections Affected

### Active Collections (Read and Updated)
- `opportunities`
- `events`
- `jobs`
- `promotions`

### Archive Collections (Written to)
- `past_opportunities`
- `past_events`
- `past_jobs`

---

## Monitoring Recommendations

### Log Patterns to Watch

#### Past Posts Service
```
🔍 Checking for expired posts before: [timestamp]
📋 Found N expired [content-type]
✅ Moved N [content-type] to past_[collection]
✅ Updated N [content-type] to inactive status
📊 Summary: N opportunities, N events, N jobs moved to past
```

#### Promotion Expiry Service
```
🔍 Checking for expired promotions...
✅ Promotion expiry check completed: N promotions updated
⚠️ N promotions expiring within 24 hours
⏰ Promotion [id] expires in N hours
```

### Performance Metrics
- Time taken for each cleanup cycle
- Number of items processed per cycle
- Database query performance
- Error rates

### Database Health
```javascript
// Check for expired content still active
db.opportunities.countDocuments({
  status: 'active',
  'dates.applicationDeadline': { $lt: new Date() }
})

// Should be 0 or very small (< 5 hrs old)

// Check for expired promotions still active
db.promotions.countDocuments({
  status: 'active',
  paymentStatus: 'paid',
  endDate: { $lt: new Date() }
})

// Should be 0 or very small (< 1 hr old)
```

---

## Recommended Index Optimizations

For optimal cleanup performance, ensure these indexes exist:

### Opportunities
```javascript
db.opportunities.createIndex({ 
  status: 1, 
  isApproved: 1, 
  'dates.applicationDeadline': 1 
})
```

### Events
```javascript
db.events.createIndex({ 
  status: 1, 
  isApproved: 1, 
  'dates.endDate': 1 
})
```

### Jobs
```javascript
db.jobs.createIndex({ 
  status: 1, 
  isApproved: 1, 
  'dates.applicationDeadline': 1 
})
```

### Promotions
```javascript
db.promotions.createIndex({ 
  status: 1, 
  paymentStatus: 1, 
  endDate: 1 
})
```

---

## Manual Cleanup Operations

### Force Past Posts Check
```bash
POST /api/admin/past-posts/check
Authorization: Bearer [admin-token]
```

### Get Past Posts Statistics
```bash
GET /api/admin/past-posts/stats
Authorization: Bearer [admin-token]
```

### Clean Up Old Completed Promotions (90+ days)
```javascript
// Run in server console or create an admin endpoint
const PromotionCleanupService = require('./src/services/promotionCleanupService');
await PromotionCleanupService.cleanupOldCompletedPromotions(90);
```

### Move Specific Post to Past Manually
```bash
POST /api/admin/past-posts/move
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "collection": "opportunities",
  "postId": "507f1f77bcf86cd799439011",
  "reason": "Manually archived by admin"
}
```

---

## Troubleshooting

### Issue: Expired content still showing as active

**Possible Causes:**
1. Cleanup service not running
2. Database queries not matching date format
3. Timezone issues

**Solution:**
```javascript
// Check service status (logs)
// Manually trigger cleanup
// Verify date formats in database
db.opportunities.findOne({ 'dates.applicationDeadline': { $exists: true } })
```

### Issue: Too many items being moved at once

**Possible Causes:**
1. Service was down for extended period
2. Bulk content uploaded with past dates

**Solution:**
- Normal behavior after restart
- Monitor system performance
- Consider pagination for large batches

### Issue: Promotions marked as both 'expired' and 'completed'

**Possible Causes:**
- Both RotationService and PromotionExpiryService are updating promotions
- Inconsistent status terminology

**Solution:**
- Review RotationService.updateExpiredPromotions()
- Standardize on 'completed' status
- Consider deprecating one method

---

## Future Enhancements

### Short Term (Recommended)
1. **Add Email Notifications**
   - Notify admins of large cleanup operations (>50 items)
   - Alert when cleanup fails

2. **Dashboard Metrics**
   - Real-time cleanup statistics
   - Historical trends
   - Performance graphs

3. **Dry Run Mode**
   - Test cleanup without actually moving data
   - Preview what would be cleaned up

### Medium Term
1. **Intelligent Scheduling**
   - Adjust frequency based on content volume
   - Run more frequently during peak submission times

2. **Soft Deletes with Recovery**
   - Grace period before permanent archival
   - Admin restore functionality

3. **Automated Archival**
   - Move very old past posts to cold storage
   - Compress archived data

### Long Term
1. **Machine Learning**
   - Predict optimal cleanup times
   - Identify content likely to expire soon
   - Anomaly detection

2. **Multi-region Support**
   - Timezone-aware cleanup
   - Regional data retention policies

---

## Configuration Files

### Environment Variables
```env
# Timezone for scheduled tasks
CRON_TIMEZONE=Africa/Lagos

# Past posts retention (days)
PAST_POSTS_RETENTION_DAYS=90

# Enable/disable cleanup services
ENABLE_PAST_POSTS_SERVICE=true
ENABLE_PROMOTION_EXPIRY_SERVICE=true
```

### Current Configuration
All configuration is currently hardcoded in service files. Consider moving to environment variables or config file for flexibility.

---

## Summary

- **Past Posts Service:** Runs every 5 hours, moves expired opportunities, events, and jobs to archive collections
- **Promotion Expiry Service:** Runs every hour, marks expired promotions as completed
- **All services:** Use Africa/Lagos timezone, log comprehensively, handle errors gracefully
- **Monitoring:** Check logs regularly, verify database queries, ensure indexes are optimized
- **Maintenance:** Consider manual cleanup of very old archived data quarterly

Last Updated: [Current Date]


