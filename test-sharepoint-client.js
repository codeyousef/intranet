#!/usr/bin/env node

/**
 * Test script to check SharePoint client connectivity
 * This tests if we can access SharePoint files using the same client as flight data
 */

const https = require('https');

// Ignore self-signed certificate errors
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Test the SharePoint test endpoint
const config = {
  hostname: '172.22.58.184',
  port: 8443,
  path: '/api/sharepoint/test',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': process.env.AUTH_COOKIE || ''
  }
};

console.log('=== SharePoint Client Test ===');
console.log('Testing SharePoint connectivity...');
console.log('Endpoint:', `https://${config.hostname}:${config.port}${config.path}`);

if (!process.env.AUTH_COOKIE) {
  console.error('\n❌ ERROR: AUTH_COOKIE environment variable not set');
  console.log('\nPlease set AUTH_COOKIE with your session cookie:');
  console.log('1. Log into the application in your browser');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Application/Storage > Cookies');
  console.log('4. Find and copy the next-auth.session-token cookie value');
  console.log('5. Run: AUTH_COOKIE="next-auth.session-token=YOUR_COOKIE_VALUE" node test-sharepoint-client.js');
  process.exit(1);
}

console.log('\nTesting SharePoint connection...\n');

const req = https.request(config, (res) => {
  console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
  
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== SharePoint Test Results ===');
    
    try {
      const jsonData = JSON.parse(data);
      
      // Connection test
      if (jsonData.connected !== undefined) {
        if (jsonData.connected) {
          console.log('✅ SharePoint connection: SUCCESSFUL');
        } else {
          console.log('❌ SharePoint connection: FAILED');
          console.log('Error:', jsonData.error);
          
          if (jsonData.details) {
            console.log('\n=== Error Details ===');
            console.log(JSON.stringify(jsonData.details, null, 2));
          }
          
          if (jsonData.troubleshooting) {
            console.log('\n=== Troubleshooting Tips ===');
            jsonData.troubleshooting.forEach((tip, index) => {
              console.log(`${index + 1}. ${tip}`);
            });
          }
        }
      }
      
      // Files list
      if (jsonData.files) {
        console.log('\n=== Files Found ===');
        console.log(`Total files: ${jsonData.files.length}`);
        
        jsonData.files.forEach((file, index) => {
          if (index < 10) { // Show first 10 files
            console.log(`${index + 1}. ${file.name} (${file.size ? file.size + ' bytes' : 'folder'})`);
          }
        });
        
        if (jsonData.files.length > 10) {
          console.log(`... and ${jsonData.files.length - 10} more files`);
        }
        
        // Check specifically for newsletter files
        const newsletterFiles = jsonData.files.filter(f => 
          f.name.toLowerCase().includes('newsletter') || 
          f.name.toLowerCase().includes('ceo')
        );
        
        if (newsletterFiles.length > 0) {
          console.log('\n=== Newsletter-related Files ===');
          newsletterFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.name}`);
          });
        }
      }
      
      // Full response for debugging
      console.log('\n=== Full Response ===');
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