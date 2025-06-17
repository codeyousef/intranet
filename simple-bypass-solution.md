# Simple Netskope Bypass - No External Services Needed

## Option 1: LocalTunnel (Free, No Signup)

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Create Tunnel
```bash
npm run tunnel
```
This will give you a URL like: `https://abc123.loca.lt`

### Step 3: Update Azure and Environment
- Add tunnel URL to Azure redirect URIs
- Update NEXTAUTH_URL in .env.local

## Option 2: Custom Hosts + Different Port (Simplest)

### Step 1: Edit Windows Hosts File (Run Notepad as Administrator)
Open: `C:\Windows\System32\drivers\etc\hosts`

Add these lines:
```
127.0.0.1 app.flyadeal.dev
127.0.0.1 intranet.flyadeal.dev
127.0.0.1 dev.flyadeal.com
```

### Step 2: Update .env.local
```
NEXTAUTH_URL=http://app.flyadeal.dev:8080
```

### Step 3: Start with Alternative Port
```bash
npm run dev:alt
```

### Step 4: Azure Redirect URI
Add to Azure (some Azure configs allow HTTP for .dev domains):
```
http://app.flyadeal.dev:8080/api/auth/callback/azure-ad
```

### Step 5: Access Application
Visit: **http://app.flyadeal.dev:8080**

## Option 3: Try Direct IP with HTTPS Override

### Step 1: Update .env.local
```
NEXTAUTH_URL=http://10.0.0.1:8080
```

### Step 2: Add to Azure
```
http://10.0.0.1:8080/api/auth/callback/azure-ad
```

### Step 3: Start Server
```bash
npm run dev:alt
```

### Step 4: Access
Visit: **http://10.0.0.1:8080**

## Option 4: Use Mobile Hotspot
1. Connect to your phone's hotspot
2. Use your phone's IP address in Azure redirect URI
3. This completely bypasses corporate network

## Current Status
✅ LocalTunnel installed (no signup required)
✅ Multiple port options available
✅ Custom domain hosts ready
✅ Alternative network options

## Quick Test
Try LocalTunnel first:
1. `npm run dev` (terminal 1)
2. `npm run tunnel` (terminal 2)
3. Use the provided .loca.lt URL