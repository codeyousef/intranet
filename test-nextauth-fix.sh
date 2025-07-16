#!/bin/bash

echo "=== Testing NextAuth Fix ==="
echo ""

# Test 1: Check if auth providers endpoint works
echo "1. Testing /api/auth/providers endpoint..."
PROVIDERS=$(curl -sk https://10.152.8.77/api/auth/providers)
if echo "$PROVIDERS" | grep -q "azure-ad"; then
    echo "   ✅ Providers endpoint works!"
else
    echo "   ❌ Providers endpoint failed"
    echo "   Response: $PROVIDERS"
fi

# Test 2: Check session endpoint
echo ""
echo "2. Testing /api/auth/session endpoint..."
SESSION=$(curl -sk https://10.152.8.77/api/auth/session)
echo "   Response: $SESSION"

# Test 3: Check CSRF token
echo ""
echo "3. Testing /api/auth/csrf endpoint..."
CSRF=$(curl -sk https://10.152.8.77/api/auth/csrf)
if echo "$CSRF" | grep -q "csrfToken"; then
    echo "   ✅ CSRF endpoint works!"
else
    echo "   ❌ CSRF endpoint failed"
fi

# Test 4: Check auth health
echo ""
echo "4. Testing /api/auth-health endpoint..."
HEALTH=$(curl -sk https://10.152.8.77/api/auth-health)
echo "   Response: $HEALTH"

echo ""
echo "=== Quick Fixes to Try ==="
echo ""
echo "If authentication still fails:"
echo ""
echo "1. Clear all cookies in browser for 10.152.8.77"
echo "2. Try incognito/private mode"
echo "3. Check PM2 logs: pm2 logs intranet-app --err"
echo "4. Rebuild and restart:"
echo "   npm run build"
echo "   pm2 restart intranet-app"
echo ""
echo "5. If AADSTS7000215 persists, regenerate the secret in Azure:"
echo "   - Go to Azure Portal > App registrations"
echo "   - Find your app (a1d4e237-dc24-4670-98fa-7a8bb45e5fca)"
echo "   - Certificates & secrets > New client secret"
echo "   - Copy the VALUE (not ID!)"
echo "   - Update .env.local with new value"
echo "   - Rebuild and restart"