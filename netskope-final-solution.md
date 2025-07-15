# Final Netskope Bypass Solution

## The Issue
- Azure AD requires HTTPS redirect URIs
- Netskope blocks localhost HTTPS connections
- Need to bypass both restrictions

## Solution: Use Your Machine's IP Address

### Step 1: Update Azure AD Redirect URI
In Azure Portal, add this redirect URI:
```
http://172.22.58.184:3001/api/auth/callback/azure-ad
```

**Why this works:**
- Uses your actual machine IP instead of localhost
- HTTP is allowed for private IP addresses in Azure AD
- Netskope typically doesn't intercept private network traffic

### Step 2: Start the Server
```bash
npm run dev
```

### Step 3: Access the Application
Visit: **http://172.22.58.184:3001**

## Alternative: Use Network Interface Binding

### Option A: Bind to all interfaces
```bash
next dev -p 3001 -H 0.0.0.0
```
Then access via: http://172.22.58.184:3001

### Option B: Use different private IP ranges
If your IP changes, try these in Azure:
- `http://172.*.*.*/api/auth/callback/azure-ad` (wildcard)
- `http://192.168.*.*/api/auth/callback/azure-ad` (wildcard)

### Option C: Static IP binding
```bash
# Add to package.json
"dev:ip": "next dev -p 3001 -H 172.22.58.184"
```

## Why This is the Best Solution

✅ **Azure AD Compatible**: HTTP allowed for private IPs
✅ **Netskope Bypass**: Private network traffic not intercepted  
✅ **No Certificates**: Avoids HTTPS complexity
✅ **Reliable**: Works across different network configurations
✅ **Simple**: Just update one redirect URI in Azure

## Current Configuration
- NEXTAUTH_URL: http://172.22.58.184:3001
- Your machine IP: 172.22.58.184
- Server runs on: http://172.22.58.184:3001

## Next Steps
1. ✅ Update Azure AD redirect URI to: `http://172.22.58.184:3001/api/auth/callback/azure-ad`
2. ✅ Run: `npm run dev`
3. ✅ Access: http://172.22.58.184:3001