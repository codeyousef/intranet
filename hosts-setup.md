# Netskope Bypass Setup for Windows

## Option 1: Local Domain Bypass (Recommended)

### Step 1: Edit Windows Hosts File
1. Open **Notepad as Administrator**
2. Open file: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line at the bottom:
```
127.0.0.1 flyadeal.local
127.0.0.1 dev.flyadeal.local
127.0.0.1 intranet.flyadeal.local
```
4. Save the file

### Step 2: Update Environment Variables
Already configured in .env.local

### Step 3: Access Application
- Use: `http://flyadeal.local:3001`
- Or: `http://dev.flyadeal.local:3001`
- Or: `http://intranet.flyadeal.local:3001`

## Option 2: Alternative Ports
Try these ports that Netskope typically doesn't intercept:
- Port 8080: `http://localhost:8080`
- Port 4000: `http://localhost:4000`
- Port 5000: `http://localhost:5000`
- Port 9000: `http://localhost:9000`

## Option 3: Use IP Address
- Try: `http://127.0.0.1:3001`
- Try: `http://0.0.0.0:3001`

## Option 4: Disable Netskope for Development
Contact your IT department to whitelist localhost or development domains.

## Current Status
✅ Application running on port 3001
✅ Environment configured for bypass
✅ Multiple access methods available