# Realistic Posts Generator

This script generates 500 posts using **real users** from your database, creating a fully realistic simulation of your platform.

## What It Does

1. **Fetches Real Users**: Pulls up to 100 real users from your `users` collection
2. **Selects Authors**: Randomly selects 20 users to be post authors
3. **Generates Posts**: Creates 500 diverse posts with:
   - Real author data (email, firstName, profileImage)
   - Diverse content (lifestyle, tech, food, travel, finance, etc.)
   - 30% polls, 20% content references, 50% regular posts
   - Realistic hashtags and timestamps (last 60 days)
4. **Generates Engagements**: All 100 users engage with posts:
   - **Likes**: Random users like posts (power-law distribution)
   - **Replies**: Subset of users reply to posts
   - **Reposts**: Subset of users repost content
   - **Bookmarks**: Subset of users bookmark posts
   - **Poll Votes**: Users vote on polls (if post has poll)
5. **Updates Database**: 
   - Inserts all posts into `posts` collection
   - Updates user `bookmarkedPosts` arrays

## Requirements

- Node.js installed
- MongoDB connection configured
- At least 20 real users in your database
- Environment variables set up (MONGODB_URI, DB_NAME)

## Usage

1. **Make sure you're in the project root directory**

2. **Run the script**:
   ```bash
   node generate-realistic-posts.js
   ```

3. **The script will**:
   - Connect to your MongoDB database
   - Fetch real users
   - Generate 500 posts with real author data
   - Create realistic engagements from all users
   - Insert everything into the database
   - Show a summary of what was created

## Output

The script will display:
- Number of users found
- Number of authors selected
- Progress of post generation
- Total engagements created:
  - Total likes
  - Total replies
  - Total reposts
  - Total bookmarks
  - Number of poll posts

## Features

✅ **Real User Data**: Uses actual user IDs, emails, and profile data  
✅ **Realistic Distribution**: Posts follow power-law engagement (some viral, most average)  
✅ **Diverse Content**: Lifestyle, tech, food, travel, finance, education, etc.  
✅ **Real Engagements**: All users engage with posts realistically  
✅ **Poll Support**: 30% of posts include interactive polls  
✅ **Content References**: 20% of posts link to opportunities/jobs/events  
✅ **Time Distribution**: Posts spread across last 60 days  

## Important Notes

⚠️ **This script will INSERT 500 new posts into your database**  
⚠️ **It will UPDATE user bookmarks**  
⚠️ **Make sure you have at least 20 users in your database**  
⚠️ **The script uses real user data - ensure you have permission**  

## Example Output

```
Connecting to MongoDB...
✅ Successfully connected to MongoDB Atlas
Fetching real users from database...
Found 100 real users
Selected 20 authors from 100 users
Generating 500 posts with real user data...
Inserting posts into database...
Inserted batch 1/10
Inserted batch 2/10
...
Updating user bookmarks...

✅ Successfully generated and inserted:
   - 500 posts from 20 real authors
   - Engagements from 100 real users
   - Total likes: 12,450
   - Total replies: 2,180
   - Total reposts: 890
   - Total bookmarks: 650
   - Poll posts: 150

✨ Script completed successfully!
```

## Troubleshooting

**Error: "Need at least 20 users"**
- Make sure you have at least 20 active users in your database
- Check that users have `isActive: true`

**Error: "MONGODB_URI not found"**
- Ensure your `.env` file is in `latest-glowup-channel/` directory
- Check that `MONGODB_URI` and `DB_NAME` are set

**Connection errors**
- Verify your MongoDB connection string
- Check network connectivity
- Ensure IP is whitelisted in MongoDB Atlas (if using Atlas)

## Next Steps

After running the script:
1. Test the feed algorithm with real user data
2. Check personalized feeds for different users
3. Verify engagements are showing correctly
4. Test pagination with the larger dataset






