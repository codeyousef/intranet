#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Run this on the server to verify all environment variables are properly loaded
 */

console.log('=== Environment Variable Verification ===');
console.log('Time:', new Date().toISOString());
console.log('Node Version:', process.version);
console.log('Current Directory:', process.cwd());
console.log('');

// Check if .env.local exists
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

console.log('Checking for environment files...');
console.log('.env.local exists:', fs.existsSync(envLocalPath));
console.log('.env exists:', fs.existsSync(envPath));
console.log('');

// Critical environment variables
const requiredVars = [
  'NODE_ENV',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID'
];

console.log('=== Required Environment Variables ===');
let hasErrors = false;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else {
    // Safely display value (mask sensitive data)
    let displayValue = value;
    if (varName.includes('SECRET')) {
      // Show first 4 and last 4 characters for secrets
      if (value.length > 8) {
        displayValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
      } else {
        displayValue = '***HIDDEN***';
      }
    } else if (varName.includes('CLIENT_ID') || varName.includes('TENANT_ID')) {
      // Show first 8 characters for IDs
      displayValue = value.substring(0, 8) + '...';
    }
    
    console.log(`✅ ${varName}: ${displayValue} (length: ${value.length})`);
    
    // Check for common issues
    if (varName === 'AZURE_AD_CLIENT_SECRET') {
      // Check for special characters
      const specialChars = value.match(/[^a-zA-Z0-9\-_.~]/g);
      if (specialChars) {
        console.log(`   ⚠️  Contains special characters: ${specialChars.join(', ')}`);
      }
      
      // Check if it might be a secret ID (UUID format)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(value)) {
        console.log(`   ⚠️  WARNING: This looks like a Secret ID (UUID), not a secret VALUE!`);
        hasErrors = true;
      }
      
      // Check length (Azure AD secrets are typically 40+ characters)
      if (value.length < 20) {
        console.log(`   ⚠️  WARNING: Secret seems too short (${value.length} chars). Azure AD secrets are typically 40+ characters.`);
      }
    }
  }
});

console.log('');

// Additional environment variables
console.log('=== Additional Environment Variables ===');
const additionalVars = [
  'POWERBI_CLIENT_ID',
  'POWERBI_CLIENT_SECRET',
  'POWERBI_TENANT_ID',
  'DATABASE_URL',
  'WEATHER_API_KEY'
];

additionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    let displayValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? '***SET***' 
      : value.substring(0, 8) + '...';
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`⚪ ${varName}: not set`);
  }
});

console.log('');

// Check if running with dotenv
try {
  require('dotenv');
  console.log('✅ dotenv package is available');
} catch (e) {
  console.log('⚪ dotenv package not found (this is fine in production)');
}

console.log('');

// Summary
if (hasErrors) {
  console.log('❌ ERRORS FOUND! Please fix the issues above before proceeding.');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
  console.log('');
  console.log('Next steps:');
  console.log('1. If AZURE_AD_CLIENT_SECRET looks like a UUID, you need to use the SECRET VALUE, not the SECRET ID');
  console.log('2. If the secret contains special characters, make sure it\'s properly quoted in .env.local');
  console.log('3. Run: npm run build && pm2 restart intranet-app');
}