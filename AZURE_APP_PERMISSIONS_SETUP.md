# Azure App Registration - SharePoint Permissions Setup

## Current Issue
The Azure app registration needs **Application Permissions** (not Delegated Permissions) to access SharePoint via Graph API.

## Required Application Permissions

Add these permissions to your Azure App Registration at:
`https://portal.azure.com` → Azure Active Directory → App registrations → Your App → API permissions

### Microsoft Graph Application Permissions:
1. **Sites.Read.All** - Read items in all site collections
2. **Sites.ReadWrite.All** - Read and write items in all site collections  
3. **Files.Read.All** - Read files in all site collections
4. **Files.ReadWrite.All** - Read and write files in all site collections

## Steps to Configure:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Find your app: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`
3. Click "API permissions"
4. Click "Add a permission"
5. Choose "Microsoft Graph"
6. Choose "Application permissions" (NOT Delegated permissions)
7. Search for and add:
   - Sites.Read.All
   - Sites.ReadWrite.All  
   - Files.Read.All
   - Files.ReadWrite.All
8. Click "Grant admin consent" for your organization

## Current Error
```
"generalException","message":"General exception while processing"
```

This error occurs when the application lacks proper permissions to access SharePoint sites programmatically.

## Alternative Solution
If application permissions cannot be granted, we can:
1. Use the existing user delegated permissions
2. Implement a manual file upload system
3. Store newsletter content directly in the database
4. Use a different SharePoint access method

## Verification
Once permissions are added, the API will show:
- ✅ Site access successful
- ✅ File retrieved from SharePoint
- 💾 Newsletter cached successfully

Instead of:
- ❌ Site access failed: 401
- ⚠️ SharePoint access failed, returning fallback content