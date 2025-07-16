#!/bin/bash

echo "=== Azure AD Authentication Fix Script ==="
echo ""
echo "This script will help fix the AADSTS7000215 error"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating proper .env.local file${NC}"
echo ""
echo "IMPORTANT: You need to provide the following values:"
echo "1. AZURE_AD_CLIENT_SECRET - The SECRET VALUE (not the Secret ID!)"
echo "2. NEXTAUTH_SECRET - A random string for encryption"
echo ""

# Create .env.local template
cat > /home/ubuntu/intranet/.env.local.template << 'EOF'
# Core Settings
NODE_ENV=production
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=YOUR_RANDOM_SECRET_HERE

# Azure AD - IMPORTANT: Use the secret VALUE, not the secret ID!
AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=YOUR_SECRET_VALUE_HERE
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Power BI (same as Azure AD)
POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=YOUR_SECRET_VALUE_HERE
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Enable debug logging
NEXTAUTH_DEBUG=true

# Database
DATABASE_URL=file:./intranet.db

# Optional
WEATHER_API_KEY=
EOF

echo -e "${GREEN}Template created at: /home/ubuntu/intranet/.env.local.template${NC}"
echo ""
echo -e "${YELLOW}Step 2: Instructions to fix the authentication${NC}"
echo ""
echo "1. Edit the template file and add your Azure AD client secret VALUE:"
echo "   nano /home/ubuntu/intranet/.env.local.template"
echo ""
echo "   IMPORTANT: In Azure Portal, when you create a client secret:"
echo "   - Copy the VALUE column (looks like: Ab1~cD2EfG3...")"
echo "   - NOT the Secret ID column (looks like: 12345678-1234-1234-1234-123456789012)"
echo ""
echo "2. Generate a random NEXTAUTH_SECRET (or use existing one):"
echo "   openssl rand -base64 32"
echo ""
echo "3. After editing, copy the template to .env.local:"
echo "   cp /home/ubuntu/intranet/.env.local.template /home/ubuntu/intranet/.env.local"
echo ""
echo "4. Verify environment variables:"
echo "   cd /home/ubuntu/intranet"
echo "   node verify-env.js"
echo ""
echo "5. If verification passes, rebuild and restart:"
echo "   npm run build"
echo "   pm2 stop intranet-app"
echo "   pm2 delete intranet-app"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 logs intranet-app --lines 50"
echo ""

echo -e "${YELLOW}Step 3: Troubleshooting tips${NC}"
echo ""
echo "If you still get errors:"
echo ""
echo "1. Check if your secret has special characters:"
echo "   - If it contains =, +, /, etc., wrap it in double quotes in .env.local"
echo "   - Example: AZURE_AD_CLIENT_SECRET=\"Ab1~cD2+EfG3/Hi4=\""
echo ""
echo "2. Try creating a new client secret in Azure AD:"
echo "   - Go to Azure Portal > App registrations > Your app > Certificates & secrets"
echo "   - Delete old secrets and create ONE new secret"
echo "   - Copy the VALUE immediately (you can't see it again)"
echo ""
echo "3. Make sure you're not using multiple secrets:"
echo "   - Having multiple active secrets can cause issues"
echo "   - Keep only one active secret"
echo ""
echo "4. Check PM2 logs for detailed errors:"
echo "   pm2 logs intranet-app --err --lines 100"
echo ""

# Create a test script
cat > /home/ubuntu/intranet/test-azure-auth.js << 'EOF'
#!/usr/bin/env node

/**
 * Test Azure AD Authentication
 * This script tests the Azure AD credentials directly
 */

const https = require('https');
const querystring = require('querystring');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID;

console.log('Testing Azure AD Authentication...');
console.log('Client ID:', clientId ? clientId.substring(0, 8) + '...' : 'NOT SET');
console.log('Tenant ID:', tenantId ? tenantId.substring(0, 8) + '...' : 'NOT SET');
console.log('Client Secret:', clientSecret ? 'SET (length: ' + clientSecret.length + ')' : 'NOT SET');
console.log('');

if (!clientId || !clientSecret || !tenantId) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Test getting an access token
const postData = querystring.stringify({
  'grant_type': 'client_credentials',
  'client_id': clientId,
  'client_secret': clientSecret,
  'scope': 'https://graph.microsoft.com/.default'
});

const options = {
  hostname: 'login.microsoftonline.com',
  port: 443,
  path: `/${tenantId}/oauth2/v2.0/token`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200 && response.access_token) {
        console.log('✅ SUCCESS! Azure AD authentication is working!');
        console.log('Token type:', response.token_type);
        console.log('Expires in:', response.expires_in, 'seconds');
      } else {
        console.error('❌ Authentication failed!');
        console.error('Status:', res.statusCode);
        console.error('Response:', JSON.stringify(response, null, 2));
        
        if (response.error === 'invalid_client' && response.error_description) {
          console.error('\n⚠️  This usually means:');
          console.error('1. You\'re using the Secret ID instead of the Secret VALUE');
          console.error('2. The secret has expired');
          console.error('3. The secret was deleted');
          console.error('4. Special characters in the secret aren\'t properly handled');
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();
EOF

chmod +x /home/ubuntu/intranet/test-azure-auth.js

echo -e "${GREEN}Created test script at: /home/ubuntu/intranet/test-azure-auth.js${NC}"
echo ""
echo "After setting up .env.local, you can test Azure AD auth with:"
echo "   cd /home/ubuntu/intranet"
echo "   node test-azure-auth.js"
echo ""