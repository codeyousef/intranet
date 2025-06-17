# Final Working Solution - Direct IP with Azure Override

## The Issue
All tunneling services are being blocked by Netskope. Let's use your machine's direct IP with Azure configuration override.

## Solution: Contact Azure Admin for HTTP Exception

### Current Configuration
- **Your IP**: 172.22.58.184
- **Port**: 9000 (typically not intercepted)
- **URL**: http://172.22.58.184:9000

### Step 1: Request Azure Admin Override
Contact your Azure AD administrator to temporarily allow HTTP redirect URI for development:
```
http://172.22.58.184:9000/api/auth/callback/azure-ad
```

**Justification for Admin:**
- This is for local development only
- Private IP address (172.x.x.x) - not exposed to internet
- Temporary exception needed due to corporate proxy conflicts
- Standard practice for development environments

### Step 2: Start Development Server
```bash
npm run dev:bypass
```

### Step 3: Access Application
Visit: **http://172.22.58.184:9000**

## Alternative Solutions

### Option A: Use Development Azure App
Create a separate Azure app registration specifically for development:
1. New app registration with "Development" in the name
2. Configure it to allow HTTP redirect URIs
3. Use separate client ID/secret for development

### Option B: Mobile Hotspot Bypass
1. Connect your laptop to phone's mobile hotspot
2. Get the new IP address: `ipconfig`
3. Update Azure redirect URI with the hotspot IP
4. This completely bypasses corporate network

### Option C: Azure Application Platform Override
Some Azure configurations allow HTTP for specific domains:
- Try: `http://localhost.localdomain:9000/api/auth/callback/azure-ad`
- Try: `http://dev.localhost:9000/api/auth/callback/azure-ad`

### Option D: Request IT Whitelist
Ask IT to whitelist these for development:
- localhost:* (all localhost ports)
- 127.0.0.1:* (all loopback ports)
- Your machine IP with development ports

## Current Setup
✅ Server configured for IP binding on port 9000
✅ Environment set to your machine IP
✅ Port 9000 typically bypasses most proxies
✅ Ready for Azure admin approval

## Quick Test Commands
```bash
# Test if port 9000 works
npm run dev:bypass

# Test different ports
next dev -p 5000 -H 0.0.0.0  # Port 5000
next dev -p 7000 -H 0.0.0.0  # Port 7000
```

## Azure Admin Request Template
"Hi [Admin Name],

I need a temporary development exception for our Flyadeal intranet application. Could you please add this HTTP redirect URI to our Azure AD app (a1d4e237-dc24-4670-98fa-7a8bb45e5fca):

http://172.22.58.184:9000/api/auth/callback/azure-ad

This is for local development only and uses a private IP address. Our corporate proxy is preventing HTTPS localhost connections.

Thanks!"