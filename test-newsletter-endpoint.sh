#!/bin/bash

echo "=== Newsletter Endpoint Test ==="
echo ""

# Test the endpoint with various scenarios
echo "1. Testing with authentication (if you have a session cookie):"
curl -k -v -H "Cookie: next-auth.session-token=your-session-token" \
  "https://10.152.8.77/api/sharepoint/newsletter-archive?path=%2FCEO%20Newsletter%2FArchive%2F38%20%26%2039.html" 2>&1 | head -50

echo ""
echo "2. Testing without authentication:"
curl -k -v "https://10.152.8.77/api/sharepoint/newsletter-archive?path=%2FCEO%20Newsletter%2FArchive%2F38%20%26%2039.html" 2>&1 | head -30

echo ""
echo "3. Check if the newsletter API file exists:"
ls -la /home/ubuntu/intranet/src/app/api/sharepoint/newsletter-archive/

echo ""
echo "4. Check recent deployments:"
git log --oneline -5

echo ""
echo "Instructions:"
echo "1. Make sure you're logged in to https://10.152.8.77 first"
echo "2. Then try accessing the newsletter archive"
echo "3. If still failing, check PM2 logs: pm2 logs intranet-app --err"