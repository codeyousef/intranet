#!/bin/bash

echo "=== Newsletter Archive API Debug ==="
echo ""

# Check if the API endpoint is accessible
echo "1. Testing API endpoint directly:"
curl -k -s https://10.152.8.77/api/sharepoint/newsletter-archive?path=%2FCEO%20Newsletter%2FArchive%2F38%20%26%2039.html | head -200

echo ""
echo "2. Checking PM2 logs for newsletter API errors:"
pm2 logs intranet-app --lines 50 | grep -i "newsletter\|sharepoint\|graph\|error" | tail -20

echo ""
echo "3. Testing Azure AD token acquisition:"
curl -k -s https://10.152.8.77/api/test-sharepoint-auth | head -100

echo ""
echo "4. Check if user is authenticated:"
curl -k -s https://10.152.8.77/api/auth/session | head -100

echo ""
echo "5. Environment variables check:"
echo "   AZURE_AD_CLIENT_ID exists: $([ -n "$AZURE_AD_CLIENT_ID" ] && echo 'Yes' || echo 'No')"
echo "   AZURE_AD_CLIENT_SECRET exists: $([ -n "$AZURE_AD_CLIENT_SECRET" ] && echo 'Yes' || echo 'No')"
echo "   AZURE_AD_TENANT_ID exists: $([ -n "$AZURE_AD_TENANT_ID" ] && echo 'Yes' || echo 'No')"

echo ""
echo "=== Recommendations ==="
echo "1. Check if you're logged in and try again"
echo "2. Look at PM2 logs for specific error messages"
echo "3. Verify Azure AD credentials are correct"
echo "4. Test SharePoint access permissions"