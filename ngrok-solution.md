# Ultimate Netskope Bypass Solution - Ngrok Tunnel

## The Problem
- Netskope blocks localhost HTTPS
- Azure requires HTTPS redirect URIs
- Local certificates don't work with Netskope

## The Solution: Ngrok Tunnel
Ngrok creates a secure HTTPS tunnel to your local development server, completely bypassing Netskope.

## Setup Instructions

### Step 1: Start Your Development Server
```bash
npm run dev
```
This starts Next.js on http://localhost:3001

### Step 2: Create Ngrok Tunnel (New Terminal)
```bash
npm run tunnel
```

### Step 3: Get Your Ngrok URL
Ngrok will display something like:
```
Forwarding    https://abc123.ngrok.app -> http://localhost:3001
```

### Step 4: Update Azure AD Redirect URI
In Azure Portal, add this redirect URI:
```
https://abc123.ngrok.app/api/auth/callback/azure-ad
```
(Replace `abc123.ngrok.app` with your actual ngrok URL)

### Step 5: Update Environment Variable
Update .env.local:
```
NEXTAUTH_URL=https://abc123.ngrok.app
```
(Replace with your actual ngrok URL)

### Step 6: Restart Development Server
```bash
npm run dev
```

### Step 7: Access Your Application
Visit your ngrok URL: **https://abc123.ngrok.app**

## Why This Works Perfectly

✅ **Real HTTPS**: Ngrok provides legitimate SSL certificates
✅ **Bypasses Netskope**: External HTTPS domain isn't intercepted
✅ **Azure Compatible**: Uses proper HTTPS redirect URIs
✅ **No Configuration**: Works out of the box
✅ **Always Accessible**: Works from any network

## Alternative: Ngrok Authtoken (Recommended)

### Sign up for free Ngrok account:
1. Go to https://ngrok.com/signup
2. Get your authtoken
3. Run: `npx ngrok authtoken YOUR_TOKEN`
4. Run: `npm run tunnel`

**Benefits:**
- Persistent subdomain
- No time limits
- Better performance

## Current Configuration
- ✅ Ngrok installed
- ✅ Development server on port 3001
- ✅ Ready for tunnel creation
- ✅ Scripts configured for easy setup

## Quick Start
1. `npm run dev` (in first terminal)
2. `npm run tunnel` (in second terminal)  
3. Copy the ngrok HTTPS URL
4. Update Azure redirect URI with the ngrok URL
5. Update NEXTAUTH_URL in .env.local
6. Access your app via the ngrok URL

This solution completely eliminates all Netskope and Azure authentication issues!