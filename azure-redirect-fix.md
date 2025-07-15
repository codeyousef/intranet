# Fix Azure AD Redirect URI

## Current Error
The redirect URI `http://172.22.58.184:3001/api/auth/callback/azure-ad` is not configured in Azure.

## Step-by-Step Fix

### 1. Go to Azure Portal
- Navigate to https://portal.azure.com
- Go to "Azure Active Directory" → "App registrations"
- Find your app: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`

### 2. Add Redirect URI
- Click on your app
- Go to "Authentication" in the left menu
- Under "Redirect URIs", click "Add URI"
- Add exactly this URI:
```
http://172.22.58.184:3001/api/auth/callback/azure-ad
```

### 3. Alternative URIs to Add (for flexibility)
Add all of these to cover different scenarios:
```
http://172.22.58.184:3001/api/auth/callback/azure-ad
http://localhost:3001/api/auth/callback/azure-ad
http://127.0.0.1:3001/api/auth/callback/azure-ad
http://172.22.58.184:8080/api/auth/callback/azure-ad
```

### 4. Save Configuration
- Click "Save" at the top of the Authentication page

### 5. Test Again
- Run: `npm run dev`
- Access: http://172.22.58.184:3001
- Try signing in

## Current App Details
- **Application ID**: a1d4e237-dc24-4670-98fa-7a8bb45e5fca
- **Required Redirect URI**: http://172.22.58.184:3001/api/auth/callback/azure-ad
- **Current NEXTAUTH_URL**: http://172.22.58.184:3001

## Alternative: Use Localhost with Different Port
If you can't use the IP address, try:

1. **Change .env.local to:**
```
NEXTAUTH_URL=http://localhost:8080
```

2. **Add this redirect URI in Azure:**
```
http://localhost:8080/api/auth/callback/azure-ad
```

3. **Run with:**
```bash
npm run dev:alt
```

The key is that whatever is in NEXTAUTH_URL must exactly match what's configured in Azure AD authentication settings.