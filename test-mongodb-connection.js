#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/glowup_channel';
const DB_NAME = process.env.DB_NAME || 'glowup_channel';

async function testConnection() {
  console.log('🧪 Testing MongoDB Connection');
  console.log('============================');
  console.log(`URI: ${MONGODB_URI.substring(0, 50)}...`);
  console.log(`Database: ${DB_NAME}`);
  console.log('');

  let client;
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected successfully!');

    const db = client.db(DB_NAME);
    
    // Test basic operations
    console.log('📊 Testing database operations...');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Test a simple query
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Users: ${userCount}`);

    const opportunitiesCollection = db.collection('opportunities');
    const opportunityCount = await opportunitiesCollection.countDocuments();
    console.log(`🎯 Opportunities: ${opportunityCount}`);

    console.log('');
    console.log('🎉 MongoDB connection test successful!');
    console.log('✅ Ready to run database operations!');

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Check if MongoDB Atlas cluster is running');
    console.error('2. Verify the connection string in .env');
    console.error('3. Check if your IP is whitelisted');
    console.error('4. Verify database credentials');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testConnection();
