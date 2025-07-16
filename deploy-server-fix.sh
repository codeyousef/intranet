#!/bin/bash

echo "=== Server Deployment Script ==="
echo "Run this on your Ubuntu server after git pull"
echo ""

# Check if we're on the server
if [ ! -f /etc/lsb-release ] || ! grep -q "Ubuntu" /etc/lsb-release; then
    echo "⚠️  This script should be run on the Ubuntu server"
    echo "Copy this script to your server and run it there"
    exit 1
fi

echo "1. Updating .env.local with correct settings..."

# Backup existing .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Backed up existing .env.local"
fi

# Extract current Azure secret if it exists
CURRENT_SECRET=""
if [ -f .env.local ] && grep -q "AZURE_AD_CLIENT_SECRET=" .env.local; then
    CURRENT_SECRET=$(grep "^AZURE_AD_CLIENT_SECRET=" .env.local | cut -d'=' -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
    echo "   ✅ Found existing Azure secret"
fi

# Create updated .env.local
cat > .env.local << EOF
# Production Environment
NODE_ENV=production

# NextAuth Configuration
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Microsoft Azure AD Configuration
AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=${CURRENT_SECRET}
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Power BI Configuration  
POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=${CURRENT_SECRET}
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Development Settings (for Netskope bypass)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Weather API Configuration
WEATHER_API_KEY=7b780a57ff2c4e11afa104921250402
DATABASE_URL=file:./intranet.db
EOF

echo "   ✅ Updated .env.local with production settings"

echo ""
echo "2. Clearing caches..."
rm -rf .next/cache
rm -rf node_modules/.cache
echo "   ✅ Cleared Next.js and node caches"

echo ""
echo "3. Rebuilding application..."
npm run build

echo ""
echo "4. Restarting PM2..."
pm2 restart intranet-app

echo ""
echo "5. Checking PM2 status..."
pm2 status intranet-app

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Test the fix:"
echo "1. Visit: https://10.152.8.77"
echo "2. Try signing in with Azure AD"
echo "3. Check logs: pm2 logs intranet-app --lines 20"
echo ""
echo "If authentication still fails:"
echo "1. Clear browser cookies for 10.152.8.77"
echo "2. Try incognito/private browsing mode"
echo "3. Check PM2 error logs: pm2 logs intranet-app --err"
EOF

chmod +x deploy-server-fix.sh