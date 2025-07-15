#!/bin/bash

echo "=== Deploying Flyadeal Intranet Fixes ==="
echo ""
echo "This script will:"
echo "1. Show current git status"
echo "2. Commit and push changes"
echo "3. Deploy to production"
echo ""

# Show what files have changed
echo "📝 Changed files:"
git status --short

echo ""
echo "📦 Committing changes..."
git add -A
git commit -m "Fix: OAuth scope error and rate limiting issues

- Fixed AADSTS28003 error by setting proper OAuth scopes
- Increased auth rate limits to prevent 429 errors
- Enhanced IP detection for rate limiting
- Changed cookie sameSite to 'lax' for sign-out"

echo ""
echo "🚀 Pushing to repository..."
git push origin main

echo ""
echo "✅ Changes pushed successfully!"
echo ""
echo "=== Next Steps on Production Server ==="
echo ""
echo "SSH to your server and run:"
echo ""
echo "cd /home/ubuntu/intranet"
echo "git pull"
echo "npm run build"
echo "pm2 restart intranet-app"
echo "pm2 logs intranet-app --lines 50"
echo ""
echo "The key fixes:"
echo "1. OAuth scope is now: 'openid profile email offline_access'"
echo "2. Auth rate limit increased to 100 requests/minute"
echo "3. Rate limit block duration reduced to 1 minute"