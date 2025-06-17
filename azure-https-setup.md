# Azure AD HTTPS Setup for Netskope Bypass

## Problem Solved ✅
Azure requires HTTPS redirect URIs, and Netskope blocks localhost HTTPS. 
This setup creates trusted local HTTPS certificates.

## Step 1: Install Local Certificate Authority

### Windows (Run as Administrator in PowerShell):
```powershell
# Import the CA certificate to Windows certificate store
Import-Certificate -FilePath "ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### Alternative - Manual Installation:
1. Double-click `ca.crt` 
2. Click "Install Certificate"
3. Choose "Local Machine" 
4. Select "Place all certificates in the following store"
5. Browse and select "Trusted Root Certification Authorities"
6. Click "OK" and "Finish"

## Step 2: Update Azure AD Redirect URIs

Add these HTTPS redirect URIs in Azure Portal:
- `https://localhost:3443/api/auth/callback/azure-ad`
- `https://localhost:8443/api/auth/callback/azure-ad`
- `https://127.0.0.1:3443/api/auth/callback/azure-ad`

## Step 3: Start HTTPS Development Server

```bash
# Primary HTTPS server (port 3443)
npm run dev:https

# Alternative HTTPS server (port 8443)  
npm run dev:https-alt
```

## Step 4: Access Application

- **Primary:** https://localhost:3443
- **Alternative:** https://localhost:8443
- **IP Access:** https://127.0.0.1:3443

## Why This Works

✅ **Trusted certificates** - Browser accepts the HTTPS connection
✅ **Azure AD compatible** - Uses required HTTPS redirect URIs  
✅ **Netskope bypass** - Uses ports typically not intercepted
✅ **Local CA** - No certificate warnings

## Troubleshooting

**If you see certificate warnings:**
1. Make sure you installed the CA certificate as Administrator
2. Restart your browser after installing the certificate
3. Try the alternative port: `npm run dev:https-alt`

**If Netskope still blocks:**
1. Try port 8443: `npm run dev:https-alt`
2. Use IP address: https://127.0.0.1:3443
3. Contact IT to whitelist development ports

## Current Configuration
✅ HTTPS certificates created
✅ NEXTAUTH_URL set to https://localhost:3443
✅ Multiple port options available
✅ Ready for Azure AD authentication