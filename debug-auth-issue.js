#!/usr/bin/env node

/**
 * Deep Debug Script for Azure AD Authentication
 * This will help identify the exact issue with your client secret
 */

const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== Azure AD Authentication Deep Debug ===');
console.log('Time:', new Date().toISOString());
console.log('');

// Get environment variables
const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID;

console.log('1. Environment Variable Check:');
console.log('   Client ID:', clientId || 'NOT SET');
console.log('   Tenant ID:', tenantId || 'NOT SET');
console.log('   Client Secret exists:', !!clientSecret);

if (clientSecret) {
  console.log('');
  console.log('2. Client Secret Analysis:');
  console.log('   Length:', clientSecret.length);
  console.log('   First 4 chars:', clientSecret.substring(0, 4));
  console.log('   Last 4 chars:', clientSecret.substring(clientSecret.length - 4));
  
  // Check character composition
  const hasLowercase = /[a-z]/.test(clientSecret);
  const hasUppercase = /[A-Z]/.test(clientSecret);
  const hasNumbers = /[0-9]/.test(clientSecret);
  const hasSpecial = /[^a-zA-Z0-9]/.test(clientSecret);
  
  console.log('   Contains lowercase:', hasLowercase);
  console.log('   Contains uppercase:', hasUppercase);
  console.log('   Contains numbers:', hasNumbers);
  console.log('   Contains special chars:', hasSpecial);
  
  if (hasSpecial) {
    const specialChars = clientSecret.match(/[^a-zA-Z0-9]/g);
    console.log('   Special characters found:', [...new Set(specialChars)].join(', '));
  }
  
  // Check for common patterns
  const isBase64 = /^[a-zA-Z0-9+/]+=*$/.test(clientSecret);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret);
  
  console.log('   Looks like Base64:', isBase64);
  console.log('   Looks like UUID:', isUUID);
  
  // Check for problematic characters
  if (clientSecret.includes(' ')) {
    console.log('   ⚠️  WARNING: Contains spaces!');
  }
  if (clientSecret.startsWith('"') || clientSecret.endsWith('"')) {
    console.log('   ⚠️  WARNING: Has quotes at start/end!');
  }
  if (clientSecret.includes('\\')) {
    console.log('   ⚠️  WARNING: Contains backslashes!');
  }
}

console.log('');
console.log('3. Testing Authentication Methods:');
console.log('');

// Method 1: Standard client credentials flow
console.log('Method 1: Client Credentials Flow');
testClientCredentials();

// Method 2: URL encoded in different ways
setTimeout(() => {
  console.log('\nMethod 2: Different Encoding');
  testWithDifferentEncoding();
}, 2000);

// Method 3: Test with basic auth header
setTimeout(() => {
  console.log('\nMethod 3: Basic Auth Header');
  testWithBasicAuth();
}, 4000);

function testClientCredentials() {
  const postData = querystring.stringify({
    'grant_type': 'client_credentials',
    'client_id': clientId,
    'client_secret': clientSecret,
    'scope': 'https://graph.microsoft.com/.default'
  });

  makeRequest(postData, {
    'Content-Type': 'application/x-www-form-urlencoded'
  }, 'Standard');
}

function testWithDifferentEncoding() {
  // Try manual encoding
  const encodedSecret = encodeURIComponent(clientSecret);
  const postData = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodedSecret}&scope=${encodeURIComponent('https://graph.microsoft.com/.default')}`;
  
  makeRequest(postData, {
    'Content-Type': 'application/x-www-form-urlencoded'
  }, 'Manual Encoding');
}

function testWithBasicAuth() {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const postData = querystring.stringify({
    'grant_type': 'client_credentials',
    'scope': 'https://graph.microsoft.com/.default'
  });

  makeRequest(postData, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${auth}`
  }, 'Basic Auth');
}

function makeRequest(postData, headers, method) {
  headers['Content-Length'] = Buffer.byteLength(postData);
  
  const options = {
    hostname: 'login.microsoftonline.com',
    port: 443,
    path: `/${tenantId}/oauth2/v2.0/token`,
    method: 'POST',
    headers: headers
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200 && response.access_token) {
          console.log(`   ✅ SUCCESS with ${method}!`);
        } else {
          console.log(`   ❌ Failed with ${method}`);
          if (response.error) {
            console.log(`   Error: ${response.error}`);
            console.log(`   Description: ${response.error_description || 'No description'}`);
            
            // Parse the error description for more details
            if (response.error_description && response.error_description.includes('AADSTS')) {
              const match = response.error_description.match(/AADSTS(\d+)/);
              if (match) {
                console.log(`   Error Code: AADSTS${match[1]}`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`   ❌ Failed to parse response for ${method}`);
        console.log(`   Raw response: ${data.substring(0, 200)}...`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`   ❌ Request failed for ${method}: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Additional checks
setTimeout(() => {
  console.log('\n4. Additional Checks:');
  console.log('');
  
  // Check if running in WSL
  if (process.platform === 'linux' && require('fs').existsSync('/proc/version')) {
    const version = require('fs').readFileSync('/proc/version', 'utf8');
    if (version.includes('Microsoft') || version.includes('WSL')) {
      console.log('   ⚠️  Running in WSL - might have encoding issues');
    }
  }
  
  // Check locale
  console.log('   System locale:', process.env.LANG || 'Not set');
  
  // Check if .env.local has BOM
  try {
    const envContent = require('fs').readFileSync('.env.local');
    if (envContent[0] === 0xEF && envContent[1] === 0xBB && envContent[2] === 0xBF) {
      console.log('   ⚠️  WARNING: .env.local has UTF-8 BOM! This can cause issues.');
    }
  } catch (e) {
    // Ignore
  }
  
  console.log('\n5. Recommendations:');
  console.log('   - If all methods fail, the secret is genuinely wrong');
  console.log('   - Try creating a new secret in Azure Portal');
  console.log('   - Make sure the app registration is in the correct tenant');
  console.log('   - Check if the app registration has been disabled');
  console.log('   - Verify the secret hasn\'t expired (check expiry date in Azure)');
}, 6000);