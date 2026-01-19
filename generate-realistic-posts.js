const { ObjectId } = require('mongodb');
const path = require('path');

// Load environment variables from the correct location
require('dotenv').config({ path: path.join(__dirname, 'latest-glowup-channel', '.env') });

const database = require('./latest-glowup-channel/src/config/database');

/**
 * Script to generate 500 posts using real users from the database
 * - Fetches up to 100 real users
 * - 20 users become authors (create posts)
 * - All 100 users engage with posts (likes, replies, reposts, bookmarks, poll votes)
 * - Creates realistic engagement patterns
 */

const generateRealisticPosts = async () => {
  try {
    // Verify environment variables are loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      console.error('   Make sure .env file exists in latest-glowup-channel/ directory');
      console.error('   Or set MONGODB_URI environment variable');
      process.exit(1);
    }

    if (!process.env.DB_NAME) {
      console.error('❌ Error: DB_NAME not found in environment variables');
      console.error('   Make sure .env file exists in latest-glowup-channel/ directory');
      process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);

    // Connect to MongoDB using existing database config
    console.log('\nConnecting to MongoDB...');
    await database.connect();
    const db = database.getDb();

    // Fetch up to 100 real users
    console.log('Fetching real users from database...');
    const users = await db.collection('users')
      .find({ isActive: true })
      .limit(100)
      .toArray();

    if (users.length < 20) {
      throw new Error(`Need at least 20 users, found only ${users.length}`);
    }

    console.log(`Found ${users.length} real users`);

    // Select 20 users as authors (randomly)
    const authorUsers = users.slice(0, 20);
    const allEngagingUsers = users; // All 100 users will engage

    console.log(`Selected ${authorUsers.length} authors from ${users.length} users`);

    // Get user profiles for better post generation
    const userIds = users.map(u => u._id);
    const userProfiles = await db.collection('user_profiles')
      .find({ userId: { $in: userIds } })
      .toArray();
    
    const profileMap = new Map();
    userProfiles.forEach(profile => {
      profileMap.set(profile.userId.toString(), profile);
    });

    // Diverse hashtags (same as before)
    const hashtags = [
      'lifestyle', 'selfcare', 'wellness', 'mindfulness', 'motivation', 'inspiration',
      'productivity', 'habits', 'goals', 'success', 'growth', 'personaldevelopment',
      'fitness', 'health', 'workout', 'gym', 'yoga', 'meditation', 'nutrition',
      'food', 'cooking', 'recipe', 'baking', 'healthyfood', 'vegan', 'vegetarian',
      'travel', 'wanderlust', 'adventure', 'explore', 'vacation', 'trip',
      'fashion', 'style', 'outfit', 'beauty', 'makeup', 'skincare',
      'finance', 'money', 'investing', 'savings', 'budgeting', 'financialfreedom',
      'education', 'learning', 'study', 'student', 'knowledge', 'skills',
      'career', 'job', 'opportunity', 'networking', 'professional',
      'entertainment', 'movies', 'music', 'books', 'reading', 'gaming', 'sports',
      'home', 'decor', 'interior', 'design', 'organization',
      'relationships', 'friendship', 'love', 'dating', 'family', 'community',
      'tech', 'coding', 'programming', 'webdev', 'app', 'digital', 'innovation'
    ];

    const pollQuestions = [
      "What's your favorite way to stay active?",
      "Which meal do you enjoy cooking most?",
      "What's your preferred travel destination type?",
      "How do you like to spend your weekends?",
      "What's your go-to productivity method?",
      "Which type of content do you consume most?",
      "What's your favorite way to relax?",
      "How do you prefer to learn new skills?",
      "What's your morning routine priority?",
      "Which investment strategy interests you?",
      "What's your favorite type of cuisine?",
      "How do you stay motivated?",
      "What's your preferred workout time?",
      "Which social media platform do you use most?",
      "What's your favorite way to save money?",
      "How do you manage stress?",
      "What's your preferred reading format?",
      "Which hobby do you want to try?",
      "What's your favorite season?",
      "How do you prefer to network?"
    ];

    const pollOptions = [
      [["Gym", "Running", "Yoga", "Home Workout"], [35, 30, 20, 15]],
      [["Breakfast", "Lunch", "Dinner", "Dessert"], [30, 25, 30, 15]],
      [["Beach", "Mountains", "City", "Countryside"], [35, 25, 25, 15]],
      [["Relaxing", "Adventures", "Socializing", "Learning"], [30, 25, 25, 20]],
      [["To-Do Lists", "Time Blocking", "Pomodoro", "Calendar"], [35, 25, 20, 20]],
      [["Videos", "Articles", "Podcasts", "Books"], [40, 25, 20, 15]],
      [["Reading", "Meditation", "Music", "Nature"], [30, 25, 25, 20]],
      [["Online Courses", "Books", "Videos", "Hands-on"], [35, 25, 25, 15]],
      [["Exercise", "Meditation", "Breakfast", "Planning"], [30, 25, 25, 20]],
      [["Stocks", "Real Estate", "Crypto", "Savings"], [30, 25, 20, 25]],
      [["Italian", "Asian", "Mexican", "Mediterranean"], [30, 25, 20, 25]],
      [["Goals", "Community", "Music", "Quotes"], [35, 25, 20, 20]],
      [["Morning", "Afternoon", "Evening", "Anytime"], [40, 20, 25, 15]],
      [["Instagram", "TikTok", "Twitter", "LinkedIn"], [35, 30, 20, 15]],
      [["Budgeting", "Investing", "Side Hustle", "Cutting Expenses"], [30, 25, 25, 20]],
      [["Exercise", "Meditation", "Hobbies", "Social"], [30, 25, 25, 20]],
      [["Physical Books", "E-books", "Audiobooks", "Articles"], [35, 25, 20, 20]],
      [["Photography", "Cooking", "Art", "Music"], [30, 25, 25, 20]],
      [["Spring", "Summer", "Fall", "Winter"], [25, 35, 25, 15]],
      [["Events", "Online", "Coffee Meetings", "Social Media"], [30, 25, 25, 20]]
    ];

    const contentTypes = ['opportunity', 'job', 'event', 'resource'];
    const cities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Toronto', 'London', 'Berlin', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Miami'];
    const provinces = ['California', 'New York', 'Texas', 'Illinois', 'Massachusetts', 'Washington', 'Ontario', 'England', 'Berlin', 'Ile-de-France', 'Tokyo', 'NSW', 'Dubai', 'Florida'];
    const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia', 'UAE'];

    const contentTitles = {
      opportunity: ['Scholarship Program', 'Grant Opportunity', 'Fellowship Program', 'Internship Program', 'Volunteer Opportunity', 'Mentorship Program'],
      job: ['Software Developer', 'Marketing Manager', 'Designer Position', 'Sales Representative', 'Project Manager', 'Content Creator', 'Fitness Instructor', 'Chef Position'],
      event: ['Workshop Series', 'Networking Event', 'Conference 2024', 'Training Session', 'Meetup Event', 'Seminar', 'Webinar', 'Festival'],
      resource: ['Online Course', 'E-book Guide', 'Toolkit Resource', 'Template Library', 'Video Series', 'Podcast Series', 'Article Collection']
    };

    const textTemplates = [
      'Just started my {0} journey! Feeling amazing already. #{0} #{1}',
      'Morning routine update: {0} has changed my life! #{0} #{1}',
      'Tips for better {0}? Share your secrets! #{0} #{1}',
      'Just made the most delicious {0} recipe! Recipe in comments 👇 #{0} #{1}',
      'Trying out a new {0} technique today. Wish me luck! #{0} #{1}',
      'Just booked my trip to explore {0}! So excited! #{0} #{1}',
      'Just saved $500 this month using these {0} strategies! #{0} #{1}',
      'Game-changing {0} tip that saved me hours! #{0} #{1}',
      'Completed my {0} challenge! Feeling stronger every day 💪 #{0} #{1}',
      'Love this {0} look I put together! #{0} #{1}',
      'Just finished an amazing course on {0}! Highly recommend! #{0} #{1}',
      'Quick {0} hack that everyone should know! #{0} #{1}',
      'Just landed a new opportunity in {0}! So grateful! #{0} #{1}',
      'Just redecorated using {0} style! Love how it turned out! #{0} #{1}',
      'Currently obsessed with {0}! Anyone else? #{0} #{1}',
      'Grateful for the {0} community! You all inspire me! #{0} #{1}'
    ];

    // Generate 500 posts
    const posts = [];
    const now = new Date();

    console.log('Generating 500 posts with real user data...');

    for (let i = 0; i < 500; i++) {
      // Select random author from the 20 authors
      const author = authorUsers[Math.floor(Math.random() * authorUsers.length)];
      const authorProfile = profileMap.get(author._id.toString());

      const postId = new ObjectId();
      const daysAgo = Math.floor(Math.random() * 60); // Posts from last 60 days
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);

      // Generate hashtags (2-5 per post)
      const numHashtags = Math.floor(Math.random() * 4) + 2;
      const postHashtags = [];
      for (let j = 0; j < numHashtags; j++) {
        const tag = hashtags[Math.floor(Math.random() * hashtags.length)];
        if (!postHashtags.includes(tag)) {
          postHashtags.push(tag);
        }
      }

      // Determine post type (30% polls, 20% content refs, 50% regular)
      const postType = Math.random();
      let content = {
        text: '',
        images: [],
        playlist: null,
        contentReference: null,
        poll: null
      };

      // Generate text content
      const template = textTemplates[Math.floor(Math.random() * textTemplates.length)];
      content.text = template
        .replace('{0}', postHashtags[0])
        .replace('{1}', postHashtags.slice(1).join(' #'));

      // 30% chance of poll
      if (postType < 0.3) {
        const pollIndex = Math.floor(Math.random() * pollQuestions.length);
        const [options, votes] = pollOptions[pollIndex];
        const pollOptionsData = options.map((opt, idx) => ({
          text: opt,
          votes: votes[idx] + Math.floor(Math.random() * 20)
        }));
        const totalVotes = pollOptionsData.reduce((sum, opt) => sum + opt.votes, 0);
        const endDate = new Date(createdAt.getTime() + (Math.floor(Math.random() * 30) + 7) * 24 * 60 * 60 * 1000);

        content.poll = {
          question: pollQuestions[pollIndex],
          options: pollOptionsData,
          endDate: endDate.toISOString(),
          totalVotes: totalVotes,
          votes: []
        };
      }
      // 20% chance of content reference
      else if (postType < 0.5) {
        const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const province = provinces[Math.floor(Math.random() * provinces.length)];
        const country = countries[Math.floor(Math.random() * countries.length)];
        const titles = contentTitles[contentType];
        const title = titles[Math.floor(Math.random() * titles.length)];
        const orgNames = ['Global Solutions', 'Innovation Hub', 'Creative Collective', 'Future Leaders', 'Success Academy', 'Growth Partners', 'Elite Network', 'Visionary Group'];

        content.contentReference = {
          type: contentType,
          contentId: new ObjectId().toString(),
          title: title,
          description: `Amazing ${contentType} opportunity in ${city}. Don't miss out!`,
          organization: orgNames[Math.floor(Math.random() * orgNames.length)],
          location: {
            country: country,
            province: province,
            city: city,
            isRemote: Math.random() > 0.5
          },
          dates: {
            applicationDeadline: new Date(now.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
          },
          financial: {
            isPaid: Math.random() > 0.3,
            amount: (Math.floor(Math.random() * 100000) + 10000).toString(),
            currency: "USD"
          }
        };
      }

      // Create post with real author data
      const post = {
        _id: postId,
        author: {
          _id: author._id,
          email: author.email,
          firstName: author.firstName || 'User',
          profileImage: author.profileImage || null
        },
        content: content,
        hashtags: postHashtags,
        mentions: [],
        visibility: Math.random() > 0.1 ? 'public' : 'private',
        likes: [],
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        bookmarkCount: 0,
        isRepost: false,
        originalPost: null,
        repostedBy: null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        isEdited: Math.random() < 0.1,
        isDeleted: false
      };

      posts.push(post);
    }

    console.log(`Generated ${posts.length} posts. Now generating engagements...`);

    // Generate realistic engagements from all 100 users
    // Each post gets engagements from a random subset of users
    const engagementUpdates = [];

    for (const post of posts) {
      // Determine engagement level (some posts more viral than others)
      const viralFactor = Math.random();
      const likeCount = Math.floor(viralFactor * viralFactor * 200);
      const replyCount = Math.floor(likeCount * (0.1 + Math.random() * 0.3));
      const repostCount = Math.floor(likeCount * (0.05 + Math.random() * 0.15));
      const bookmarkCount = Math.floor(likeCount * (0.03 + Math.random() * 0.1));
      const pollVoteCount = post.content.poll ? Math.floor(likeCount * (0.2 + Math.random() * 0.3)) : 0;

      // Select random users to engage (not all users engage with all posts)
      const numLikers = Math.min(likeCount, allEngagingUsers.length);
      const numRepliers = Math.min(replyCount, allEngagingUsers.length);
      const numReposters = Math.min(repostCount, allEngagingUsers.length);
      const numBookmarkers = Math.min(bookmarkCount, allEngagingUsers.length);
      const numVoters = post.content.poll ? Math.min(pollVoteCount, allEngagingUsers.length) : 0;

      // Shuffle users for random selection
      const shuffledUsers = [...allEngagingUsers].sort(() => Math.random() - 0.5);

      // Generate likes
      const likers = shuffledUsers.slice(0, numLikers);
      const likeIds = likers.map(u => u._id);

      // Generate replies (subset of likers)
      const repliers = shuffledUsers.slice(0, numRepliers);

      // Generate reposts (subset of likers)
      const reposters = shuffledUsers.slice(0, numReposters);

      // Generate bookmarks (subset of likers)
      const bookmarkers = shuffledUsers.slice(0, numBookmarkers);

      // Generate poll votes (if post has poll)
      const pollVotes = [];
      if (post.content.poll && numVoters > 0) {
        const voters = shuffledUsers.slice(0, numVoters);
        const postCreatedAt = new Date(post.createdAt);
        const postUpdatedAt = new Date(post.updatedAt);
        voters.forEach(voter => {
          const optionIndex = Math.floor(Math.random() * post.content.poll.options.length);
          pollVotes.push({
            userId: voter._id,
            optionIndex: optionIndex
          });
        });
      }

      // Update post with engagements
      post.likes = likeIds;
      post.likeCount = likeIds.length;
      post.replyCount = numRepliers;
      post.repostCount = numReposters;
      post.bookmarkCount = numBookmarkers;

      // Update poll votes if exists
      if (post.content.poll && pollVotes.length > 0) {
        post.content.poll.votes = pollVotes;
        post.content.poll.totalVotes = pollVotes.length;
      }

      // Track bookmarks for user updates
      bookmarkers.forEach(user => {
        if (!engagementUpdates.find(e => e.userId.toString() === user._id.toString())) {
          engagementUpdates.push({
            userId: user._id,
            bookmarkedPosts: [post._id]
          });
        } else {
          const update = engagementUpdates.find(e => e.userId.toString() === user._id.toString());
          update.bookmarkedPosts.push(post._id);
        }
      });
    }

    console.log('Inserting posts into database...');
    
    // Insert posts in batches
    const batchSize = 50;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      await db.collection('posts').insertMany(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(posts.length / batchSize)}`);
    }

    console.log('Updating user bookmarks...');
    
    // Update user bookmarks
    for (const update of engagementUpdates) {
      await db.collection('users').updateOne(
        { _id: update.userId },
        { 
          $addToSet: { 
            bookmarkedPosts: { $each: update.bookmarkedPosts } 
          } 
        }
      );
    }

    console.log('\n✅ Successfully generated and inserted:');
    console.log(`   - ${posts.length} posts from ${authorUsers.length} real authors`);
    console.log(`   - Engagements from ${allEngagingUsers.length} real users`);
    console.log(`   - Total likes: ${posts.reduce((sum, p) => sum + p.likeCount, 0)}`);
    console.log(`   - Total replies: ${posts.reduce((sum, p) => sum + p.replyCount, 0)}`);
    console.log(`   - Total reposts: ${posts.reduce((sum, p) => sum + p.repostCount, 0)}`);
    console.log(`   - Total bookmarks: ${posts.reduce((sum, p) => sum + p.bookmarkCount, 0)}`);
    console.log(`   - Poll posts: ${posts.filter(p => p.content.poll).length}`);

  } catch (error) {
    console.error('Error generating posts:', error);
    throw error;
  } finally {
    await database.disconnect();
    console.log('\nDatabase connection closed.');
  }
};

// Run the script
if (require.main === module) {
  generateRealisticPosts()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateRealisticPosts };

