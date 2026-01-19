const { ObjectId } = require('mongodb');

// Generate 500 test posts for algorithm testing
const generateTestPosts = () => {
  const posts = [];
  const authors = [];
  const hashtags = [
    // Lifestyle & Personal
    'lifestyle', 'selfcare', 'wellness', 'mindfulness', 'motivation', 'inspiration',
    'productivity', 'habits', 'goals', 'success', 'growth', 'personaldevelopment',
    'mindset', 'positivity', 'gratitude', 'happiness', 'balance', 'worklifebalance',
    
    // Health & Fitness
    'fitness', 'health', 'workout', 'gym', 'yoga', 'meditation', 'nutrition',
    'healthy', 'exercise', 'running', 'cycling', 'strength', 'cardio', 'wellness',
    'mentalhealth', 'selflove', 'bodypositive', 'fitnessmotivation',
    
    // Food & Cooking
    'food', 'cooking', 'recipe', 'baking', 'healthyfood', 'vegan', 'vegetarian',
    'mealprep', 'foodie', 'delicious', 'homemade', 'chef', 'culinary', 'dining',
    
    // Travel & Adventure
    'travel', 'wanderlust', 'adventure', 'explore', 'vacation', 'trip', 'journey',
    'destination', 'travelgram', 'sightseeing', 'culture', 'backpacking', 'solo',
    
    // Fashion & Beauty
    'fashion', 'style', 'outfit', 'beauty', 'makeup', 'skincare', 'fashionista',
    'ootd', 'trendy', 'aesthetic', 'glam', 'beautyhacks', 'fashiontips',
    
    // Finance & Money
    'finance', 'money', 'investing', 'savings', 'budgeting', 'financialfreedom',
    'stocks', 'crypto', 'entrepreneurship', 'business', 'sidehustle', 'passiveincome',
    'wealth', 'moneytips', 'financialplanning', 'frugal',
    
    // Education & Learning
    'education', 'learning', 'study', 'student', 'knowledge', 'skills', 'tutorial',
    'tips', 'tricks', 'howto', 'guide', 'learn', 'studygram', 'academic',
    
    // Career & Professional
    'career', 'job', 'opportunity', 'networking', 'professional', 'resume',
    'interview', 'careeradvice', 'jobsearch', 'careergoals', 'work', 'office',
    
    // Entertainment & Hobbies
    'entertainment', 'movies', 'music', 'books', 'reading', 'gaming', 'sports',
    'photography', 'art', 'creative', 'diy', 'crafts', 'hobby', 'fun',
    
    // Home & Decor
    'home', 'decor', 'interior', 'design', 'organization', 'cleaning', 'homeimprovement',
    'renovation', 'diyhome', 'minimalist', 'cozy', 'homestyle',
    
    // Relationships & Social
    'relationships', 'friendship', 'love', 'dating', 'family', 'community', 'social',
    'connection', 'support', 'together', 'friends', 'socializing',
    
    // Tech (reduced but still present)
    'tech', 'coding', 'programming', 'webdev', 'app', 'digital', 'innovation',
    'software', 'gadgets', 'technology', 'startup', 'ai', 'online'
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
  
  // Diverse content titles based on type
  const contentTitles = {
    opportunity: ['Scholarship Program', 'Grant Opportunity', 'Fellowship Program', 'Internship Program', 'Volunteer Opportunity', 'Mentorship Program'],
    job: ['Software Developer', 'Marketing Manager', 'Designer Position', 'Sales Representative', 'Project Manager', 'Content Creator', 'Fitness Instructor', 'Chef Position'],
    event: ['Workshop Series', 'Networking Event', 'Conference 2024', 'Training Session', 'Meetup Event', 'Seminar', 'Webinar', 'Festival'],
    resource: ['Online Course', 'E-book Guide', 'Toolkit Resource', 'Template Library', 'Video Series', 'Podcast Series', 'Article Collection']
  };

  // Generate 50 unique authors
  for (let i = 0; i < 50; i++) {
    authors.push({
      _id: new ObjectId(),
      email: `user${i + 1}@example.com`,
      firstName: ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'John', 'Maria', 'Chris', 'Anna'][i % 10],
      profileImage: `https://i.pravatar.cc/150?img=${i + 1}`
    });
  }

  // Generate 500 posts
  for (let i = 0; i < 500; i++) {
    const author = authors[i % 50];
    const postId = new ObjectId();
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 60); // Posts from last 60 days
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);

    // Determine post type (30% polls, 20% content refs, 50% regular)
    const postType = Math.random();
    let content = {
      text: '',
      images: [],
      playlist: null,
      contentReference: null,
      poll: null
    };

    // Generate hashtags (2-5 per post)
    const numHashtags = Math.floor(Math.random() * 4) + 2;
    const postHashtags = [];
    for (let j = 0; j < numHashtags; j++) {
      const tag = hashtags[Math.floor(Math.random() * hashtags.length)];
      if (!postHashtags.includes(tag)) {
        postHashtags.push(tag);
      }
    }

    // Generate text content - diverse topics
    const textTemplates = [
      // Lifestyle & Wellness
      `Just started my ${postHashtags[0]} journey! Feeling amazing already. #${postHashtags.join(' #')}`,
      `Morning routine update: ${postHashtags[0]} has changed my life! #${postHashtags.join(' #')}`,
      `Tips for better ${postHashtags[0]}? Share your secrets! #${postHashtags.join(' #')}`,
      `Can't believe how much ${postHashtags[0]} has improved my ${postHashtags[1]}! #${postHashtags.join(' #')}`,
      
      // Food & Cooking
      `Just made the most delicious ${postHashtags[0]} recipe! Recipe in comments 👇 #${postHashtags.join(' #')}`,
      `Trying out a new ${postHashtags[0]} technique today. Wish me luck! #${postHashtags.join(' #')}`,
      `Best ${postHashtags[0]} tips I've learned this week! #${postHashtags.join(' #')}`,
      
      // Travel & Adventure
      `Just booked my trip to explore ${postHashtags[0]}! So excited! #${postHashtags.join(' #')}`,
      `Travel tip: Always pack ${postHashtags[0]} when going to ${postHashtags[1]} destinations! #${postHashtags.join(' #')}`,
      `My favorite ${postHashtags[0]} experience so far! #${postHashtags.join(' #')}`,
      
      // Finance & Money
      `Just saved $500 this month using these ${postHashtags[0]} strategies! #${postHashtags.join(' #')}`,
      `Learning about ${postHashtags[0]} investing. Any advice? #${postHashtags.join(' #')}`,
      `Financial tip: ${postHashtags[0]} has helped me build wealth! #${postHashtags.join(' #')}`,
      
      // Productivity & Tips
      `Game-changing ${postHashtags[0]} tip that saved me hours! #${postHashtags.join(' #')}`,
      `My ${postHashtags[0]} routine that keeps me productive! #${postHashtags.join(' #')}`,
      `Trying a new ${postHashtags[0]} method this week. Let's see how it goes! #${postHashtags.join(' #')}`,
      
      // Health & Fitness
      `Completed my ${postHashtags[0]} challenge! Feeling stronger every day 💪 #${postHashtags.join(' #')}`,
      `${postHashtags[0]} has been a game-changer for my health! #${postHashtags.join(' #')}`,
      `Starting my ${postHashtags[0]} journey today! Who's with me? #${postHashtags.join(' #')}`,
      
      // Fashion & Style
      `Love this ${postHashtags[0]} look I put together! #${postHashtags.join(' #')}`,
      `${postHashtags[0]} style tips that never fail! #${postHashtags.join(' #')}`,
      `Trying out a new ${postHashtags[0]} trend. What do you think? #${postHashtags.join(' #')}`,
      
      // Education & Learning
      `Just finished an amazing course on ${postHashtags[0]}! Highly recommend! #${postHashtags.join(' #')}`,
      `Learning ${postHashtags[0]} has opened so many doors! #${postHashtags.join(' #')}`,
      `Best resources for learning ${postHashtags[0]}? Share below! #${postHashtags.join(' #')}`,
      
      // General Tips & Tricks
      `Quick ${postHashtags[0]} hack that everyone should know! #${postHashtags.join(' #')}`,
      `Tried this ${postHashtags[0]} tip and it worked perfectly! #${postHashtags.join(' #')}`,
      `Sharing my favorite ${postHashtags[0]} strategies! #${postHashtags.join(' #')}`,
      
      // Career & Professional
      `Just landed a new opportunity in ${postHashtags[0]}! So grateful! #${postHashtags.join(' #')}`,
      `Career advice: ${postHashtags[0]} has been key to my success! #${postHashtags.join(' #')}`,
      `Networking tip: Always focus on ${postHashtags[0]} when building connections! #${postHashtags.join(' #')}`,
      
      // Home & Decor
      `Just redecorated using ${postHashtags[0]} style! Love how it turned out! #${postHashtags.join(' #')}`,
      `Home organization tip: ${postHashtags[0]} has transformed my space! #${postHashtags.join(' #')}`,
      
      // Entertainment & Hobbies
      `Currently obsessed with ${postHashtags[0]}! Anyone else? #${postHashtags.join(' #')}`,
      `My new hobby: ${postHashtags[0]}! So much fun! #${postHashtags.join(' #')}`,
      
      // Relationships & Social
      `Grateful for the ${postHashtags[0]} community! You all inspire me! #${postHashtags.join(' #')}`,
      `Building meaningful connections through ${postHashtags[0]}! #${postHashtags.join(' #')}`
    ];
    content.text = textTemplates[Math.floor(Math.random() * textTemplates.length)];

    // 30% chance of poll
    if (postType < 0.3) {
      const pollIndex = Math.floor(Math.random() * pollQuestions.length);
      const [options, votes] = pollOptions[pollIndex];
      const pollOptionsData = options.map((opt, idx) => ({
        text: opt,
        votes: votes[idx] + Math.floor(Math.random() * 20) // Add some variance
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

    // Generate engagement counts (some posts more viral than others)
    const viralFactor = Math.random();
    const likeCount = Math.floor(viralFactor * viralFactor * 200); // Power law distribution
    const replyCount = Math.floor(likeCount * (0.1 + Math.random() * 0.3));
    const repostCount = Math.floor(likeCount * (0.05 + Math.random() * 0.15));
    const bookmarkCount = Math.floor(likeCount * (0.03 + Math.random() * 0.1));

    // Generate some likes array (sample user IDs)
    const likes = [];
    const numLikes = Math.min(likeCount, 50); // Limit to 50 actual user IDs
    for (let j = 0; j < numLikes; j++) {
      likes.push(authors[Math.floor(Math.random() * authors.length)]._id);
    }

    posts.push({
      _id: postId,
      author: author,
      content: content,
      hashtags: postHashtags,
      mentions: [],
      visibility: Math.random() > 0.1 ? 'public' : 'private', // 90% public
      likes: likes,
      likeCount: likeCount,
      replyCount: replyCount,
      repostCount: repostCount,
      bookmarkCount: bookmarkCount,
      isRepost: Math.random() < 0.05, // 5% reposts
      originalPost: null,
      repostedBy: null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      isEdited: Math.random() < 0.1, // 10% edited
      isDeleted: false
    });
  }

  return posts;
};

// Generate and output
const posts = generateTestPosts();
console.log(JSON.stringify(posts, null, 2));

