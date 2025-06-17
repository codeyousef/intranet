# Debug Azure AD Configuration

## Current Setup
- **NEXTAUTH_URL**: https://172.22.58.184:8443
- **Azure App ID**: a1d4e237-dc24-4670-98fa-7a8bb45e5fca
- **Required Redirect URI**: https://172.22.58.184:8443/api/auth/callback/azure-ad

## Step-by-Step Azure AD Verification

### 1. Check Redirect URI in Azure Portal
1. Go to https://portal.azure.com
2. Navigate to "Azure Active Directory" → "App registrations"
3. Find app: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`
4. Click "Authentication"
5. Verify this EXACT redirect URI exists:
   ```
   https://172.22.58.184:8443/api/auth/callback/azure-ad
   ```

### 2. Check Application Type
In "Authentication" section, ensure:
- **Platform**: Web
- **Redirect URI Type**: Web
- **Allow public client flows**: No (should be off)

### 3. Check API Permissions
In "API permissions" section, ensure you have:
- Microsoft Graph → User.Read (Delegated)
- Status should be "Granted for [Your Organization]"

### 4. Check Application Settings
In "Overview" section, verify:
- **Application (client) ID**: a1d4e237-dc24-4670-98fa-7a8bb45e5fca
- **Directory (tenant) ID**: 6b8805cf-83d0-4342-bd38-fb3b3df952be

### 5. Check Client Secret
In "Certificates & secrets":
- Ensure you have an active client secret
- Copy the VALUE (not the Secret ID)
- Update your .env.local with the actual secret value

## Common Issues & Solutions

### Issue 1: Wrong Redirect URI
**Problem**: URI in Azure doesn't match exactly
**Solution**: Must be exactly `https://172.22.58.184:8443/api/auth/callback/azure-ad`

### Issue 2: Missing Client Secret
**Problem**: Client secret is expired or wrong
**Solution**: Create new secret in Azure, update .env.local

### Issue 3: API Permissions Not Granted
**Problem**: Admin consent not given
**Solution**: Click "Grant admin consent" in API permissions

### Issue 4: Wrong Tenant Configuration
**Problem**: App configured for wrong tenant
**Solution**: Verify tenant ID matches your organization

## Test Configuration
After verifying Azure settings, test with this URL:
```
https://login.microsoftonline.com/6b8805cf-83d0-4342-bd38-fb3b3df952be/oauth2/v2.0/authorize?client_id=a1d4e237-dc24-4670-98fa-7a8bb45e5fca&response_type=code&redirect_uri=https%3A%2F%2F172.22.58.184%3A8443%2Fapi%2Fauth%2Fcallback%2Fazure-ad&scope=openid%20profile%20email
```

If this URL works, the issue is in NextAuth configuration.
If this URL fails, the issue is in Azure AD configuration.

## Current Environment Variables to Check
```
AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=[VERIFY THIS IS CORRECT VALUE]
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be
NEXTAUTH_URL=https://172.22.58.184:8443
```

## Next Steps
1. Verify redirect URI in Azure Portal
2. Check client secret is correct and not expired
3. Ensure API permissions are granted
4. Test the direct Azure URL above
5. Report back what you find!