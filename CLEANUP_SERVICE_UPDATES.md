# Past Posts Cleanup Service Updates

## Overview
Updated the Past Posts Cleanup Service to run more frequently and with improved tracking and data integrity.

## Changes Made

### 1. Schedule Update
**Before:** Ran daily at 2 AM
**After:** Runs every 5 hours

**Cron Expression Changed:**
- From: `'0 2 * * *'` (daily at 2 AM)
- To: `'0 */5 * * *'` (every 5 hours at the top of the hour)

**Benefits:**
- More responsive cleanup of expired content
- Expired content is removed more quickly from active listings
- Better user experience with up-to-date content

### 2. Immediate Startup Check
Added an immediate cleanup check when the service starts, in addition to the scheduled runs.

**Implementation:**
```javascript
// Also run immediately on startup
console.log('🔄 Running initial past posts check...');
this.moveExpiredPostsToPast().catch(err => {
  console.error('❌ Error in initial past posts check:', err);
});
```

**Benefits:**
- Cleans up any expired content that accumulated while the server was down
- Ensures database is immediately in sync after deployments
- No waiting period for the first scheduled run

### 3. Enhanced Result Tracking
Added comprehensive tracking of cleanup results.

**Changes:**
- Each cleanup method now returns the count of items moved
- Main function tracks and logs summary statistics
- Better monitoring and debugging capabilities

**Example Output:**
```
📊 Summary: 5 opportunities, 3 events, 2 jobs moved to past
```

### 4. Improved Data Integrity
Enhanced the update operations to set multiple fields for better data consistency.

**Fields Now Set on Expired Content:**
- `status: 'inactive'` - Marks content as inactive
- `isApproved: false` - Removes approval status
- `isValid: false` - Marks content as no longer valid
- `movedToPastAt: now` - Timestamp when moved
- `pastReason: '...'` - Reason for expiration

**Benefits:**
- More consistent data state
- Prevents edge cases where expired content might still appear
- Better audit trail for content lifecycle

### 5. Error Handling
Improved error handling across all cleanup methods.

**Changes:**
- All methods return 0 on error instead of undefined
- Errors are logged but don't crash the service
- Main function can continue even if one content type fails

## Data Structure Compatibility

The service correctly handles the current MongoDB data structure:

### Opportunities
- Checks: `dates.applicationDeadline`
- Updates to: `inactive`, moves to `past_opportunities`

### Events
- Checks: `dates.endDate`
- Updates to: `inactive`, moves to `past_events`

### Jobs
- Checks: `dates.applicationDeadline`
- Updates to: `inactive`, moves to `past_jobs`

### Resources
- Resources don't have expiration dates (timeless content)
- Not included in cleanup process

## Collections Created

The service creates and manages these "past" collections:
- `past_opportunities`
- `past_events`
- `past_jobs`

**Metadata Added to Past Items:**
- `movedToPastAt`: Date when moved
- `originalCollection`: Source collection name
- `pastStatus`: Status ('expired' or 'moved')
- `reason`: Why it was moved (e.g., "Application deadline passed")

## Query Criteria

### Opportunities & Jobs
```javascript
{
  status: 'active',
  isApproved: true,
  'dates.applicationDeadline': { $lt: now, $ne: null }
}
```

### Events
```javascript
{
  status: 'active',
  isApproved: true,
  'dates.endDate': { $lt: now, $ne: null }
}
```

**Key Points:**
- Only moves active, approved content
- Respects null dates (doesn't move content without deadlines)
- Uses MongoDB's date comparison for accuracy

## Service Lifecycle

### Start
1. Service starts on server initialization
2. Runs immediate cleanup check
3. Schedules cron job for every 5 hours
4. Logs: "✅ Past posts service started - running every 5 hours"

### Running
- Executes every 5 hours at: 00:00, 05:00, 10:00, 15:00, 20:00
- Logs detailed information about each operation
- Tracks and reports results

### Stop
- Called during graceful server shutdown
- Stops the cron job
- Logs: "⏹️ Past posts service stopped"

## Testing Recommendations

### Manual Testing
```bash
# Test the cleanup manually via API (if route is exposed)
POST /api/admin/past-posts/check

# Check past posts statistics
GET /api/admin/past-posts/stats

# View past posts
GET /api/admin/past-posts?collection=opportunities&limit=50
```

### Database Verification
```javascript
// Check for expired opportunities still active
db.opportunities.find({
  status: 'active',
  'dates.applicationDeadline': { $lt: new Date() }
}).count()

// Should return 0 after cleanup runs

// Check past collections
db.past_opportunities.find().sort({ movedToPastAt: -1 }).limit(10)
```

## Monitoring

### Log Messages
- **🔍** - Starting check
- **📋** - Found expired items
- **✅** - Successfully moved/updated items
- **❌** - Errors encountered
- **📊** - Summary statistics

### What to Monitor
1. Frequency of expired items found
2. Any recurring errors in logs
3. Growth rate of past collections
4. Server performance around cleanup times

## Performance Considerations

### Database Load
- Uses indexed queries (`status`, `isApproved`, date fields)
- Batch operations for updates
- Runs during potentially low-traffic times

### Optimization
- Consider adding compound indexes if collections grow large:
  ```javascript
  db.opportunities.createIndex({ 
    status: 1, 
    isApproved: 1, 
    'dates.applicationDeadline': 1 
  })
  ```

### Data Retention
The service includes a method to clean up old past posts (90+ days):
```javascript
await pastPostsService.cleanupOldCompletedPromotions(90)
```
Consider scheduling this monthly to manage database size.

## Configuration

### Timezone
Currently set to: `'Africa/Lagos'`
Can be modified in the cron schedule options if needed.

### Schedule Modification
To change the frequency, modify the cron expression:
- Every 3 hours: `'0 */3 * * *'`
- Every hour: `'0 * * * *'`
- Every 6 hours: `'0 */6 * * *'`

## Integration Points

### Server Initialization (server.js)
```javascript
const pastPostsService = require('./src/services/pastPostsService');
// ...
pastPostsService.start();
```

### Graceful Shutdown (server.js)
```javascript
pastPostsService.stop();
```

### Admin API (pastPostsController.js)
- Manual trigger endpoint
- Statistics endpoint
- View past posts endpoint
- Move individual post endpoint

## Next Steps

1. **Monitor Initial Behavior**
   - Watch logs for the first few 5-hour cycles
   - Verify expired content is being properly moved
   - Check for any error patterns

2. **Consider Additional Features**
   - Email notifications for large cleanup operations
   - Dashboard metrics for past posts
   - Restore functionality for accidentally expired content

3. **Database Maintenance**
   - Set up regular archiving of very old past posts
   - Consider compression for past collections
   - Monitor index performance

## Rollback Plan

If issues arise, revert the schedule to daily:
```javascript
// In pastPostsService.js, line 21
this.task = cron.schedule('0 2 * * *', async () => {
  // ...
});
```

## Summary

The updated cleanup service is now more responsive, better tracked, and more robust. It will keep your active content listings clean by moving expired opportunities, events, and jobs every 5 hours instead of once daily. The initial startup check ensures the database is immediately in sync after deployments.


