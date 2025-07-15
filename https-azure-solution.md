# HTTPS Solution for Azure AD + Netskope

## The Issue
Azure AD requires HTTPS redirect URIs, and Netskope blocks localhost HTTPS.

## Solution: Self-Signed Certificate + Browser Override

### Step 1: Install Certificate Authority (REQUIRED)

**Run as Administrator in PowerShell:**
```powershell
# Navigate to your project directory first
cd "D:\Projects\Next\intranet"

# Import the CA certificate
Import-Certificate -FilePath "ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### Step 2: Azure AD Configuration
Add this HTTPS redirect URI in Azure Portal:
```
https://localhost:3443/api/auth/callback/azure-ad
```

### Step 3: Start HTTPS Server
```bash
npm run dev:https
```

### Step 4: Access Application
1. Go to: **https://localhost:3443**
2. If you see "Your connection is not private":
   - Click "Advanced"
   - Click "Proceed to localhost (unsafe)"

## Alternative: Browser Certificate Override

### Chrome/Edge Method:
1. Go to https://localhost:3443
2. Click the "Not secure" warning in address bar
3. Click "Certificate is not valid"
4. Click "Proceed to localhost (unsafe)"

### Firefox Method:
1. Go to https://localhost:3443
2. Click "Advanced"
3. Click "Accept the Risk and Continue"

## Why This Works

✅ **Azure AD Requirement**: Uses HTTPS redirect URI
✅ **Self-Signed Certificate**: Browser accepts with override
✅ **Port 3443**: Typically not intercepted by Netskope
✅ **Local Development**: Bypasses proxy restrictions

## Troubleshooting

**If HTTPS still doesn't work:**

1. **Try different HTTPS port:**
```bash
# Edit package.json to use port 8443
"dev:https": "next dev -p 8443"

# Update .env.local
NEXTAUTH_URL=https://localhost:8443

# Update Azure redirect URI to:
https://localhost:8443/api/auth/callback/azure-ad
```

2. **Use the custom server:**
```bash
npm run dev:https-alt
```

3. **Try IP address with HTTPS:**
```bash
# Update .env.local to:
NEXTAUTH_URL=https://172.22.58.184:3443

# Update Azure redirect URI to:
https://172.22.58.184:3443/api/auth/callback/azure-ad
```

## Current Configuration
- ✅ NEXTAUTH_URL: https://localhost:3443
- ✅ HTTPS certificates created
- ✅ Next.js configured for HTTPS development
- ✅ Ready for Azure AD authentication

## Key Point
The browser certificate warning is NORMAL for development. Just click "Proceed to localhost (unsafe)" and the authentication will work perfectly.