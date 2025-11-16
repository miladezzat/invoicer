/**
 * Test script to demonstrate API analytics functionality
 * 
 * This script shows how to:
 * 1. Make API requests that will be tracked
 * 2. Retrieve analytics data
 * 3. View recent requests
 * 
 * Usage:
 *   npm run ts-node scripts/test-api-analytics.ts
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY; // Public API key (inv_xxxxx)
const JWT_TOKEN = process.env.JWT_TOKEN; // User JWT token for viewing analytics

async function makePublicApiRequests() {
  console.log('\n📊 Making test API requests...\n');

  if (!API_KEY) {
    console.error('❌ API_KEY environment variable is required');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test various endpoints
    const endpoints = [
      { method: 'GET', url: '/public/apis/v1/health' },
      { method: 'GET', url: '/public/apis/v1/invoices' },
      { method: 'GET', url: '/public/apis/v1/invoices?status=paid' },
      { method: 'GET', url: '/public/apis/v1/clients' },
      { method: 'GET', url: '/public/apis/v1/analytics?period=30d' },
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios({
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.url}`,
          headers,
        });
        const duration = Date.now() - startTime;
        
        console.log(`✅ ${endpoint.method} ${endpoint.url}`);
        console.log(`   Status: ${response.status}, Duration: ${duration}ms`);
      } catch (error: any) {
        console.log(`❌ ${endpoint.method} ${endpoint.url}`);
        console.log(`   Error: ${error.response?.status || 'Network error'}`);
      }
    }

    // Try to access a non-existent invoice (will generate a 404)
    try {
      await axios.get(`${BASE_URL}/public/apis/v1/invoices/nonexistent123`, { headers });
    } catch (error: any) {
      console.log(`✅ Expected 404 error logged for analytics`);
    }

  } catch (error) {
    console.error('❌ Error making API requests:', error);
  }
}

async function viewAnalytics() {
  console.log('\n📈 Viewing Analytics...\n');

  if (!JWT_TOKEN) {
    console.error('❌ JWT_TOKEN environment variable is required to view analytics');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
  };

  try {
    // Get overall analytics
    console.log('📊 Overall API Analytics (30 days):');
    const analyticsResponse = await axios.get(
      `${BASE_URL}/developer/api-keys/analytics?period=30d`,
      { headers }
    );
    
    const analytics = analyticsResponse.data.data;
    console.log(`   Total Requests: ${analytics.totalRequests}`);
    console.log(`   Successful: ${analytics.successfulRequests}`);
    console.log(`   Failed: ${analytics.failedRequests}`);
    console.log(`   Avg Response Time: ${analytics.averageResponseTime}ms`);
    
    console.log('\n   Top Endpoints:');
    analytics.requestsByEndpoint.slice(0, 5).forEach((ep: any) => {
      console.log(`     ${ep.endpoint}: ${ep.count} requests`);
    });

    console.log('\n   Requests by Method:');
    analytics.requestsByMethod.forEach((method: any) => {
      console.log(`     ${method.method}: ${method.count} requests`);
    });

    // Get recent requests
    console.log('\n📋 Recent API Requests (last 10):');
    const recentResponse = await axios.get(
      `${BASE_URL}/developer/api-keys/analytics/recent?limit=10`,
      { headers }
    );
    
    recentResponse.data.data.forEach((req: any, index: number) => {
      const statusIcon = req.statusCode < 400 ? '✅' : '❌';
      console.log(`\n   ${index + 1}. ${statusIcon} ${req.method} ${req.endpoint}`);
      console.log(`      Status: ${req.statusCode}, Time: ${req.responseTime}ms`);
      console.log(`      IP: ${req.ip}, Time: ${new Date(req.timestamp).toLocaleString()}`);
      if (req.errorMessage) {
        console.log(`      Error: ${req.errorMessage}`);
      }
    });

    // Get API key stats
    console.log('\n📊 API Key Statistics:');
    const statsResponse = await axios.get(
      `${BASE_URL}/developer/api-keys/stats`,
      { headers }
    );
    
    const stats = statsResponse.data.data;
    console.log(`   Total Keys: ${stats.totalKeys}`);
    console.log(`   Active Keys: ${stats.activeKeys}`);
    console.log(`   Total Usage: ${stats.totalUsage}`);

  } catch (error: any) {
    console.error('❌ Error viewing analytics:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 API Analytics Test Script');
  console.log('================================');

  // Wait a bit between requests
  await makePublicApiRequests();
  
  // Wait a moment for analytics to be logged
  console.log('\n⏳ Waiting for analytics to be processed...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await viewAnalytics();

  console.log('\n✅ Test completed!');
  console.log('\n💡 Tips:');
  console.log('   - View analytics in real-time as you use your API');
  console.log('   - Use different time periods: 24h, 7d, 30d, 90d');
  console.log('   - Check analytics per API key for detailed insights');
  console.log('   - Analytics data is retained for 90 days');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch(console.error);









