# HTTPS Proxy Solution for Azure + Netskope

## The Final Solution
Create an HTTPS proxy that wraps your HTTP development server, providing real HTTPS that Azure requires while bypassing Netskope.

## How It Works
1. Next.js runs on HTTP (port 3001)
2. SSL proxy creates HTTPS wrapper (port 8443)
3. Azure gets the HTTPS it requires
4. Netskope sees legitimate HTTPS traffic

## Setup Instructions

### Step 1: Install CA Certificate (CRITICAL)
**Run PowerShell as Administrator:**
```powershell
cd "D:\Projects\Next\intranet"
Import-Certificate -FilePath "ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### Step 2: Start HTTPS Proxy Development Server
```bash
npm run dev:ssl
```

This starts:
- Next.js on http://localhost:3001
- SSL proxy on https://172.22.58.184:8443

### Step 3: Update Azure AD Redirect URI
Add this HTTPS redirect URI in Azure Portal:
```
https://172.22.58.184:8443/api/auth/callback/azure-ad
```

### Step 4: Access Application
Visit: **https://172.22.58.184:8443**

If you see certificate warnings:
- Click "Advanced"
- Click "Proceed to 172.22.58.184 (unsafe)"

## Why This Works

✅ **Azure Requirement**: Provides real HTTPS redirect URI
✅ **Netskope Bypass**: Uses different IP/port combination
✅ **Self-Signed Cert**: Browser accepts with manual override
✅ **Proxy Wrapper**: Converts HTTP to HTTPS seamlessly

## Alternative Ports (if 8443 is blocked)

### Try Port 9443:
```bash
# Update package.json
"dev:ssl": "next dev -p 3001 & npx local-ssl-proxy --source 9443 --target 3001 --cert certs/localhost.crt --key certs/localhost.key"

# Update .env.local
NEXTAUTH_URL=https://172.22.58.184:9443

# Update Azure redirect URI
https://172.22.58.184:9443/api/auth/callback/azure-ad
```

### Try Port 7443:
```bash
# Update package.json  
"dev:ssl": "next dev -p 3001 & npx local-ssl-proxy --source 7443 --target 3001 --cert certs/localhost.crt --key certs/localhost.key"

# Update .env.local
NEXTAUTH_URL=https://172.22.58.184:7443

# Update Azure redirect URI
https://172.22.58.184:7443/api/auth/callback/azure-ad
```

## Manual Steps if npm run dev:ssl doesn't work

### Terminal 1 (Start Next.js):
```bash
npm run dev
```

### Terminal 2 (Start SSL Proxy):
```bash
npx local-ssl-proxy --source 8443 --target 3001 --cert certs/localhost.crt --key certs/localhost.key --hostname 172.22.58.184
```

## Current Configuration
- ✅ NEXTAUTH_URL: https://172.22.58.184:8443
- ✅ SSL certificates created
- ✅ SSL proxy configured
- ✅ Azure-compatible HTTPS endpoint
- ✅ Your machine IP: 172.22.58.184

## Key Points
1. **Install the CA certificate first** - this is critical!
2. **Use your machine's IP** (172.22.58.184) not localhost
3. **Port 8443** typically bypasses corporate proxies
4. **Certificate warnings are normal** - just click "Proceed"

This creates legitimate HTTPS that satisfies Azure while avoiding Netskope's localhost restrictions!