#!/usr/bin/env node

/**
 * NextAuth-specific debugging script
 * This will help identify why NextAuth fails when direct auth works
 */

const https = require('https');
const querystring = require('querystring');
const { URL } = require('url');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== NextAuth Configuration Debug ===');
console.log('Time:', new Date().toISOString());
console.log('');

// Check critical environment variables
console.log('1. Environment Variables Check:');
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET');
console.log('   NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('');

// Check if NEXTAUTH_URL is properly formatted
if (process.env.NEXTAUTH_URL) {
  try {
    const url = new URL(process.env.NEXTAUTH_URL);
    console.log('2. NEXTAUTH_URL Analysis:');
    console.log('   Protocol:', url.protocol);
    console.log('   Host:', url.host);
    console.log('   Port:', url.port || 'default');
    console.log('   Valid URL:', true);
    
    // Check callback URL
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`;
    console.log('   Callback URL:', callbackUrl);
  } catch (e) {
    console.log('   ❌ ERROR: Invalid NEXTAUTH_URL format!');
  }
} else {
  console.log('   ❌ ERROR: NEXTAUTH_URL not set!');
}

console.log('');
console.log('3. NextAuth Secret Analysis:');
if (process.env.NEXTAUTH_SECRET) {
  console.log('   Length:', process.env.NEXTAUTH_SECRET.length);
  console.log('   Is Base64:', /^[a-zA-Z0-9+/]+=*$/.test(process.env.NEXTAUTH_SECRET));
  console.log('   Has special chars:', /[^a-zA-Z0-9+/=]/.test(process.env.NEXTAUTH_SECRET));
} else {
  console.log('   ❌ ERROR: NEXTAUTH_SECRET not set!');
}

console.log('');
console.log('4. Testing NextAuth Callback URL:');

// Test if the callback URL is accessible
if (process.env.NEXTAUTH_URL) {
  const callbackUrl = new URL('/api/auth/callback/azure-ad', process.env.NEXTAUTH_URL);
  
  // For HTTPS URLs, allow self-signed certificates
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  
  const options = {
    hostname: callbackUrl.hostname,
    port: callbackUrl.port || 443,
    path: callbackUrl.pathname,
    method: 'GET',
    agent: callbackUrl.protocol === 'https:' ? agent : undefined
  };
  
  const req = https.request(options, (res) => {
    console.log('   Callback URL response status:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 400) {
      console.log('   ✅ Callback URL is reachable');
    } else {
      console.log('   ⚠️  Unexpected status code');
    }
  });
  
  req.on('error', (e) => {
    console.log('   ❌ ERROR reaching callback URL:', e.message);
  });
  
  req.end();
}

console.log('');
console.log('5. Checking for common NextAuth issues:');

// Check for spaces in secrets
if (process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_SECRET.includes(' ')) {
  console.log('   ⚠️  WARNING: Client secret contains spaces');
}

// Check for quotes in environment variables
const checkQuotes = (name, value) => {
  if (value && (value.startsWith('"') || value.endsWith('"') || value.startsWith("'") || value.endsWith("'"))) {
    console.log(`   ⚠️  WARNING: ${name} has quotes - remove them!`);
    return true;
  }
  return false;
};

checkQuotes('NEXTAUTH_URL', process.env.NEXTAUTH_URL);
checkQuotes('AZURE_AD_CLIENT_SECRET', process.env.AZURE_AD_CLIENT_SECRET);
checkQuotes('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET);

// Check for BOM in .env.local
try {
  const fs = require('fs');
  const envContent = fs.readFileSync('.env.local');
  if (envContent[0] === 0xEF && envContent[1] === 0xBB && envContent[2] === 0xBF) {
    console.log('   ❌ ERROR: .env.local has UTF-8 BOM! This breaks environment parsing.');
    console.log('   Fix with: sed -i \'1s/^\\xEF\\xBB\\xBF//\' .env.local');
  }
} catch (e) {
  console.log('   ⚠️  Could not check .env.local for BOM');
}

console.log('');
console.log('6. Creating test configuration...');

// Create a minimal test configuration
const testConfig = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
  hasSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
};

console.log('   Configuration summary:', JSON.stringify(testConfig, null, 2));

console.log('');
console.log('7. Recommendations:');
console.log('');
console.log('   If direct Azure AD auth works but NextAuth fails:');
console.log('   1. Check PM2 logs: pm2 logs intranet-app --err --lines 100');
console.log('   2. Ensure NEXTAUTH_URL matches your actual URL (https://10.152.8.77)');
console.log('   3. Remove any quotes from environment variables');
console.log('   4. Generate a new NEXTAUTH_SECRET: openssl rand -base64 32');
console.log('   5. Check if .env.local has proper formatting (no BOM, no CRLF)');
console.log('   6. Verify the callback URL is registered in Azure AD');
console.log('');
console.log('   Next steps:');
console.log('   - Run: pm2 logs intranet-app --err --lines 100');
console.log('   - Look for specific NextAuth error messages');
console.log('   - Check browser console for any client-side errors');
console.log('   - Try accessing: ' + process.env.NEXTAUTH_URL + '/api/auth/providers');