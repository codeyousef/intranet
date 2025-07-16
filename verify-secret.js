#!/usr/bin/env node

/**
 * Simple secret verification without external dependencies
 */

const fs = require('fs');

console.log('=== Secret Verification ===');

// Read .env.local manually
let envContent = '';
try {
  envContent = fs.readFileSync('.env.local', 'utf8');
} catch (e) {
  console.log('❌ Could not read .env.local');
  process.exit(1);
}

// Extract values
const lines = envContent.split('\n');
const config = {};

lines.forEach(line => {
  if (line.includes('=') && !line.trim().startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    let value = valueParts.join('=');
    // Remove quotes if present
    value = value.replace(/^["']|["']$/g, '');
    config[key.trim()] = value;
  }
});

console.log('Environment variables found:');
console.log('  NEXTAUTH_URL:', config.NEXTAUTH_URL || 'NOT SET');
console.log('  NODE_ENV:', config.NODE_ENV || 'NOT SET');
console.log('  AZURE_AD_CLIENT_ID:', config.AZURE_AD_CLIENT_ID || 'NOT SET');
console.log('  AZURE_AD_TENANT_ID:', config.AZURE_AD_TENANT_ID || 'NOT SET');
console.log('  Client secret exists:', !!config.AZURE_AD_CLIENT_SECRET);

if (config.AZURE_AD_CLIENT_SECRET) {
  const secret = config.AZURE_AD_CLIENT_SECRET;
  console.log('\nSecret analysis:');
  console.log('  Length:', secret.length);
  console.log('  First 4 chars:', secret.substring(0, 4));
  console.log('  Last 4 chars:', secret.substring(secret.length - 4));
  
  // Check for issues
  const issues = [];
  if (secret.includes(' ')) issues.push('Contains spaces');
  if (secret.startsWith('"') || secret.endsWith('"')) issues.push('Has quotes');
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secret)) {
    issues.push('Looks like UUID (should be secret VALUE not ID!)');
  }
  
  if (issues.length > 0) {
    console.log('  ⚠️  Issues found:', issues.join(', '));
  } else {
    console.log('  ✅ Secret looks properly formatted');
  }
}

// Check callback URL format
if (config.NEXTAUTH_URL) {
  const callbackUrl = config.NEXTAUTH_URL + '/api/auth/callback/azure-ad';
  console.log('\nCallback URL:', callbackUrl);
  
  if (config.NEXTAUTH_URL === 'https://10.152.8.77') {
    console.log('✅ NEXTAUTH_URL is correctly set for production');
  } else {
    console.log('⚠️  NEXTAUTH_URL might need to be https://10.152.8.77 for production');
  }
}

console.log('\n=== Recommendations ===');
console.log('1. Rebuild: npm run build');
console.log('2. Restart: pm2 restart intranet-app');
console.log('3. Clear browser cookies for 10.152.8.77');
console.log('4. Test in incognito mode');