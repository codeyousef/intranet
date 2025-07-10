# SharePoint Newsletter Authentication Fix

## Current Issue
The newsletter feature is failing with 401 Unauthorized errors when trying to access:
`https://flyadeal.sharepoint.com/sites/Thelounge/CEO Newsletter/last-newsletter.html`

## Root Cause
The Azure App Registration (`a1d4e237-dc24-4670-98fa-7a8bb45e5fca`) is missing the required **Application Permissions** for SharePoint access via Microsoft Graph API.

## Solution 1: Add Application Permissions (Recommended)

### Steps for IT Admin:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: Azure Active Directory → App registrations
3. Find the app: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`
4. Click on "API permissions"
5. Click "Add a permission"
6. Choose "Microsoft Graph"
7. Choose **"Application permissions"** (NOT Delegated permissions)
8. Add these permissions:
   - `Sites.Read.All` - Read items in all site collections
   - `Files.Read.All` - Read files in all site collections
9. Click "Grant admin consent" for Flyadeal

### Verification:
After adding permissions, test using:
```
https://172.22.58.184:8443/api/sharepoint/debug-permissions
```

## Solution 2: Grant User Access (Alternative)

If application permissions cannot be granted:

1. Ensure all users who need to see the newsletter have direct access to:
   - SharePoint site: `https://flyadeal.sharepoint.com/sites/Thelounge`
   - File: `/CEO Newsletter/last-newsletter.html`

2. Users can be granted access through:
   - SharePoint site permissions
   - Security group membership
   - Direct file sharing

## Solution 3: Manual Newsletter Upload (Temporary)

While permissions are being fixed:

1. The app now includes a caching mechanism at `/api/sharepoint/newsletter-cached`
2. IT can manually update the newsletter cache file: `.newsletter-cache.json`
3. The cache persists for 1 hour and survives server restarts

## Testing Endpoints

1. **Debug Permissions**: `/api/sharepoint/debug-permissions`
   - Shows current authentication status
   - Tests Graph API token acquisition
   - Checks SharePoint access permissions

2. **Cached Newsletter**: `/api/sharepoint/newsletter-cached`
   - Returns cached content if available
   - Falls back gracefully when SharePoint is inaccessible

3. **SharePoint Test**: `/api/sharepoint/test`
   - Tests basic SharePoint connectivity
   - Lists files in the root folder

## Current Workaround

The application now uses a cached endpoint that:
- Caches successful newsletter fetches for 1 hour
- Returns cached content when SharePoint is unavailable
- Provides a user-friendly fallback message
- Saves cache to disk to survive restarts

## Contact

For questions or assistance:
- Check debug endpoint: `/api/sharepoint/debug-permissions`
- Review logs for request IDs starting with `newsletter-`
- Contact the development team with the error ID shown in the UI

---
*Last updated: January 2025*