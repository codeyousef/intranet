#!/bin/bash

echo "=== Azure AD App Registration Checklist ==="
echo ""
echo "Please verify these items in Azure Portal:"
echo ""
echo "1. App Registration Status:"
echo "   - Go to: Azure Portal > Azure Active Directory > App registrations"
echo "   - Search for: a1d4e237-dc24-4670-98fa-7a8bb45e5fca"
echo "   - Verify the app is NOT disabled or deleted"
echo ""
echo "2. Tenant Verification:"
echo "   - Confirm Tenant ID: 6b8805cf-83d0-4342-bd38-fb3b3df952be"
echo "   - Make sure you're in the correct tenant"
echo ""
echo "3. Client Secret Status:"
echo "   - Go to: Certificates & secrets"
echo "   - Check the expiry date of your secret"
echo "   - Verify there's only ONE active secret"
echo "   - Note: Expired secrets show with a red warning"
echo ""
echo "4. API Permissions:"
echo "   - Go to: API permissions"
echo "   - Ensure these permissions are granted:"
echo "     * Microsoft Graph > openid (Delegated)"
echo "     * Microsoft Graph > profile (Delegated)"
echo "     * Microsoft Graph > email (Delegated)"
echo "     * Microsoft Graph > User.Read (Delegated)"
echo "   - Click 'Grant admin consent' if needed"
echo ""
echo "5. Authentication Settings:"
echo "   - Go to: Authentication"
echo "   - Platform configurations > Add platform > Web (if not exists)"
echo "   - Redirect URIs should include:"
echo "     * https://10.152.8.77/api/auth/callback/azure-ad"
echo "     * https://172.22.58.184:8443/api/auth/callback/azure-ad"
echo "   - Ensure 'ID tokens' is checked under 'Implicit grant'"
echo ""
echo "6. Common Issues to Check:"
echo "   [ ] Secret has expired"
echo "   [ ] Secret was deleted and recreated (old one might be cached)"
echo "   [ ] App registration is in wrong tenant"
echo "   [ ] App registration is disabled"
echo "   [ ] Conditional Access policies blocking the app"
echo "   [ ] IP restrictions on the app"
echo ""
echo "7. Test in Azure Portal:"
echo "   - Go to: Overview"
echo "   - Click 'Endpoints'"
echo "   - Copy 'OAuth 2.0 token endpoint (v2)'"
echo "   - Should be: https://login.microsoftonline.com/6b8805cf-83d0-4342-bd38-fb3b3df952be/oauth2/v2.0/token"
echo ""

# Create a manual test script
cat > test-manual-auth.sh << 'EOF'
#!/bin/bash

# Manual test with curl
echo "Testing Azure AD authentication with curl..."
echo ""
echo "Enter your Azure AD details:"
read -p "Client ID [a1d4e237-dc24-4670-98fa-7a8bb45e5fca]: " CLIENT_ID
CLIENT_ID=${CLIENT_ID:-a1d4e237-dc24-4670-98fa-7a8bb45e5fca}

read -p "Tenant ID [6b8805cf-83d0-4342-bd38-fb3b3df952be]: " TENANT_ID  
TENANT_ID=${TENANT_ID:-6b8805cf-83d0-4342-bd38-fb3b3df952be}

read -sp "Client Secret (hidden): " CLIENT_SECRET
echo ""

echo ""
echo "Testing authentication..."

RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=https://graph.microsoft.com/.default")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool || echo "$RESPONSE"
EOF

chmod +x test-manual-auth.sh

echo "Created manual test script: test-manual-auth.sh"
echo ""
echo "After checking Azure Portal, you can run:"
echo "   ./test-manual-auth.sh"