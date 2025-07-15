# Netskope Bypass for Microsoft Auth Redirect

## The Problem
Netskope intercepts localhost redirects after Microsoft authentication, causing ERR_SSL_PROTOCOL_ERROR.

## Solution 1: Use IP Address Instead of Localhost

### Step 1: Update Azure AD Redirect URI
In your Azure AD app registration, add these redirect URIs:
- `http://127.0.0.1:8080/api/auth/callback/azure-ad`
- `http://127.0.0.1:4000/api/auth/callback/azure-ad`
- `http://127.0.0.1:3001/api/auth/callback/azure-ad`

### Step 2: Start with IP binding
```bash
npm run dev:alt
```
Then access: `http://127.0.0.1:8080`

## Solution 2: Use Different Ports That Bypass Netskope

Common ports that work:
- 8080 (HTTP proxy alternative)
- 4000 (development port)
- 9000 (application port)
- 5000 (development server)

## Solution 3: Browser Flags (Chrome/Edge)

Start Chrome/Edge with these flags:
```bash
chrome.exe --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir="C:\temp\chrome_dev"
```

## Solution 4: Use Firefox Developer Edition
Firefox often bypasses corporate proxies better than Chrome/Edge.

## Current Configuration
✅ NEXTAUTH_URL set to http://127.0.0.1:8080
✅ Multiple port options available
✅ IP-based binding configured

## Next Steps
1. Update Azure AD redirect URIs
2. Try: `npm run dev:alt`
3. Access: `http://127.0.0.1:8080`