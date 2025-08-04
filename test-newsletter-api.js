#!/usr/bin/env node

/**
 * Test script for newsletter API endpoint
 * This script tests the newsletter API endpoint directly
 */

const https = require('https');

// Ignore self-signed certificate errors
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Configuration
const config = {
  hostname: '172.22.58.184',
  port: 8443,
  path: '/api/sharepoint/newsletter',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': process.env.AUTH_COOKIE || ''
  }
};

console.log('=== Newsletter API Test ===');
console.log('Testing endpoint:', `https://${config.hostname}:${config.port}${config.path}`);

if (!process.env.AUTH_COOKIE) {
  console.error('\n❌ ERROR: AUTH_COOKIE environment variable not set');
  console.log('\nPlease set AUTH_COOKIE with your session cookie:');
  console.log('1. Log into the application in your browser');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Application/Storage > Cookies');
  console.log('4. Find and copy the next-auth.session-token cookie value');
  console.log('5. Run: AUTH_COOKIE="next-auth.session-token=YOUR_COOKIE_VALUE" node test-newsletter-api.js');
  process.exit(1);
}

console.log('\nMaking request to newsletter API...');

const req = https.request(config, (res) => {
  console.log(`\nResponse Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('Response Headers:', res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== Response Body ===');
    
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success) {
        console.log('\n✅ Newsletter fetched successfully!');
        console.log('Source:', jsonData.newsletter?.source);
        console.log('Content length:', jsonData.newsletter?.content?.length || 0);
        console.log('From cache:', jsonData.fromCache || false);
        
        // Show first 500 characters of content
        if (jsonData.newsletter?.content) {
          console.log('\n=== Content Preview (first 500 chars) ===');
          console.log(jsonData.newsletter.content.substring(0, 500));
        }
      } else {
        console.log('\n❌ Newsletter fetch failed');
        console.log('Error:', jsonData.error);
        console.log('Details:', jsonData.details);
      }
    } catch (e) {
      console.log('Raw response:', data);
      console.error('\nError parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Request error:', e.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure the development server is running (npm run dev:https)');
  console.log('2. Check that you can access https://172.22.58.184:8443 in your browser');
  console.log('3. Ensure your AUTH_COOKIE is valid and not expired');
});

req.end();

console.log('\nWaiting for response...');