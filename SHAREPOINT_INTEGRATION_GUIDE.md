# SharePoint Integration Setup Guide

## Current Issue
The API is returning `401 Unauthorized` when trying to access SharePoint content, indicating missing permissions.

## Required Azure App Permissions

### 1. Add SharePoint Permissions to Azure App
Go to your Azure App Registration (`a1d4e237-dc24-4670-98fa-7a8bb45e5fca`) and add these permissions:

#### Microsoft Graph Permissions:
- **Sites.Read.All** (Delegated) - Read items in all site collections
- **Sites.ReadWrite.All** (Delegated) - Read and write items in all site collections  
- **Files.Read.All** (Delegated) - Read all files that user can access
- **Files.ReadWrite.All** (Delegated) - Read and write all files that user can access

#### SharePoint Permissions:
- **AllSites.Read** (Delegated) - Read items in all site collections
- **AllSites.Write** (Delegated) - Read and write items in all site collections

### 2. Grant Admin Consent
After adding permissions, click "Grant admin consent for [Organization]"

## Alternative Approaches

### Option 1: Use Sharing Link Token
SharePoint sharing URLs have embedded access tokens that work differently than Graph API tokens.

### Option 2: Service Principal Access
Configure the app with Application permissions instead of Delegated permissions.

### Option 3: SharePoint App-Only Authentication
Set up SharePoint-specific authentication using SharePoint App registration.

## Testing Steps

1. **Add permissions** to Azure app
2. **Grant admin consent**  
3. **Sign out and sign back in** to get new token with SharePoint scopes
4. **Test the API** at `/api/sharepoint/newsletter`
5. **Check console logs** for detailed error information

## Expected SharePoint URL Formats

Your current URL:
```
https://flyadeal.sharepoint.com/:u:/s/Thelounge/EbmTH-roSPpIlOelea0QeTkBagnZ0L9eV9kuFXEt2bUwBA?e=5yRgje
```

This might need to be converted to a direct file URL format for API access.

## Troubleshooting

### If permissions don't work:
1. Verify the newsletter document permissions in SharePoint
2. Check if the document is in a restricted site
3. Consider using SharePoint REST API instead of Graph API
4. Try embedding via iframe as fallback

### Admin Tasks Required:
- Azure AD admin must grant SharePoint permissions
- SharePoint admin may need to allow API access to the site
- Document permissions may need adjustment in SharePoint

## Implementation Priority

1. **High**: Add Azure permissions and test
2. **Medium**: Try SharePoint REST API approach  
3. **Low**: Implement iframe embedding as fallback

---

*Next: Add the required permissions to Azure app registration and test the integration.*