// Simple test script to verify the new promoted endpoints work
const BASE_URL = 'http://localhost:5000'; // Adjust if your backend runs on a different port

async function testPromotedEndpoints() {
  console.log('Testing promoted content endpoints...\n');
  
  const endpoints = [
    '/api/promoted/opportunities',
    '/api/promoted/events', 
    '/api/promoted/jobs',
    '/api/promoted/resources'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(`${BASE_URL}${endpoint}?limit=5`);
      const data = await response.json();
      
      if (data.success) {
        const contentType = endpoint.split('/').pop();
        const items = data.data[contentType] || [];
        console.log(`✅ ${endpoint}: ${items.length} items found`);
        if (items.length > 0) {
          console.log(`   Sample item: ${items[0].title}`);
          console.log(`   Is promoted: ${items[0].isPromoted}`);
        }
      } else {
        console.log(`❌ ${endpoint}: ${data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Error - ${error.message}`);
    }
    console.log('');
  }
}

// Run the test
testPromotedEndpoints().catch(console.error);

