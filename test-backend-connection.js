#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://latest-glowup-channel-761979347865.europe-west1.run.app';

async function testBackendConnection() {
  console.log('🧪 Testing Backend Connection');
  console.log('============================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`);
    console.log('   ✅ Health check passed');
    console.log(`   Response: ${healthResponse.substring(0, 100)}...`);
    console.log('');

    // Test opportunities endpoint
    console.log('2. Testing opportunities endpoint...');
    const opportunitiesResponse = await makeRequest(`${BACKEND_URL}/api/opportunities`);
    const opportunitiesData = JSON.parse(opportunitiesResponse);
    console.log('   ✅ Opportunities endpoint working');
    console.log(`   Found ${opportunitiesData.data?.opportunities?.length || 0} opportunities`);
    console.log('');

    // Test events endpoint
    console.log('3. Testing events endpoint...');
    const eventsResponse = await makeRequest(`${BACKEND_URL}/api/events`);
    const eventsData = JSON.parse(eventsResponse);
    console.log('   ✅ Events endpoint working');
    console.log(`   Found ${eventsData.data?.events?.length || 0} events`);
    console.log('');

    // Test jobs endpoint
    console.log('4. Testing jobs endpoint...');
    const jobsResponse = await makeRequest(`${BACKEND_URL}/api/jobs`);
    const jobsData = JSON.parse(jobsResponse);
    console.log('   ✅ Jobs endpoint working');
    console.log(`   Found ${jobsData.data?.jobs?.length || 0} jobs`);
    console.log('');

    // Test resources endpoint
    console.log('5. Testing resources endpoint...');
    const resourcesResponse = await makeRequest(`${BACKEND_URL}/api/resources`);
    const resourcesData = JSON.parse(resourcesResponse);
    console.log('   ✅ Resources endpoint working');
    console.log(`   Found ${resourcesData.data?.resources?.length || 0} resources`);
    console.log('');

    console.log('🎉 All backend tests passed!');
    console.log('✅ Your backend is ready to use!');

  } catch (error) {
    console.error('❌ Backend connection test failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting steps:');
    console.error('1. Check if the backend URL is correct');
    console.error('2. Verify the backend is deployed and running');
    console.error('3. Check if there are any CORS issues');
    console.error('4. Verify the backend logs for any errors');
    process.exit(1);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Run the test
testBackendConnection();

