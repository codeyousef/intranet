#!/usr/bin/env node

/**
 * Test script to check SharePoint newsletter access
 * This script tests the newsletter-list API endpoint which uses the SharePoint client
 */

const https = require('https');

// Ignore self-signed certificate errors
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Configuration
const config = {
  hostname: '172.22.58.184',
  port: 8443,
  path: '/api/sharepoint/newsletter-list?force_fetch=true',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': process.env.AUTH_COOKIE || ''
  }
};

console.log('=== SharePoint Newsletter Test ===');
console.log('Testing endpoint:', `https://${config.hostname}:${config.port}${config.path}`);
console.log('Force fetch enabled: true');

if (!process.env.AUTH_COOKIE) {
  console.error('\n❌ ERROR: AUTH_COOKIE environment variable not set');
  console.log('\nPlease set AUTH_COOKIE with your session cookie:');
  console.log('1. Log into the application in your browser');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Application/Storage > Cookies');
  console.log('4. Find and copy the next-auth.session-token cookie value');
  console.log('5. Run: AUTH_COOKIE="next-auth.session-token=YOUR_COOKIE_VALUE" node test-sharepoint-newsletter.js');
  process.exit(1);
}

console.log('\nMaking request to newsletter-list API...');
console.log('This will test the SharePoint client (same as flight data)...\n');

const req = https.request(config, (res) => {
  console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
  
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== Response Analysis ===');
    
    try {
      const jsonData = JSON.parse(data);
      
      if (jsonData.success) {
        console.log('✅ Newsletter fetched successfully!');
        console.log('\n=== Newsletter Details ===');
        console.log('Title:', jsonData.newsletter?.title);
        console.log('Source:', jsonData.newsletter?.source);
        console.log('Cached:', jsonData.newsletter?.cached || false);
        console.log('Content length:', jsonData.newsletter?.content?.length || 0);
        console.log('Last updated:', jsonData.newsletter?.lastUpdated);
        
        // Check if it's fallback content
        if (jsonData.newsletter?.isFallback || jsonData.newsletter?.source === 'system') {
          console.log('\n⚠️  WARNING: This is fallback content, not from SharePoint!');
        }
        
        // Show content preview
        if (jsonData.newsletter?.content) {
          console.log('\n=== Content Preview (first 300 chars) ===');
          const preview = jsonData.newsletter.content
            .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim()
            .substring(0, 300);
          console.log(preview + '...');
        }
      } else {
        console.log('❌ Newsletter fetch failed');
        console.log('Success:', jsonData.success);
        console.log('Error:', jsonData.error);
        console.log('Error Type:', jsonData.errorType);
        console.log('Details:', jsonData.details);
        
        if (jsonData.searchedPaths) {
          console.log('\n=== Searched Paths ===');
          jsonData.searchedPaths.forEach((path, index) => {
            console.log(`${index + 1}. ${path}`);
          });
        }
        
        if (jsonData.fallbackContent) {
          console.log('\n⚠️  Fallback content was provided to prevent UI errors');
          console.log('Fallback title:', jsonData.fallbackContent.title);
          console.log('Is fallback:', jsonData.fallbackContent.isFallback);
          console.log('Fallback reason:', jsonData.fallbackContent.fallbackReason);
        }
      }
      
      // Log full response for debugging
      console.log('\n=== Full Response (for debugging) ===');
      console.log(JSON.stringify(jsonData, null, 2));
      
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

console.log('Waiting for response...');