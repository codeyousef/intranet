# Azure AD Authentication Fix Guide

## Error: AADSTS7000215 - Invalid client secret provided

This error means the client secret being sent to Azure AD is incorrect. Here's how to fix it:

## Quick Diagnosis

1. **Check auth health endpoint** (after deployment):
   ```
   https://10.152.8.77/api/auth-health
   ```

2. **Run environment verification**:
   ```bash
   cd /home/ubuntu/intranet
   node verify-env.js
   ```

3. **Test Azure AD directly**:
   ```bash
   node test-azure-auth.js
   ```

## Common Issues and Solutions

### 1. Using Secret ID Instead of Secret Value

**Problem**: You copied the Secret ID (UUID) instead of the secret value.

**Solution**:
- In Azure Portal > App registrations > Your app > Certificates & secrets
- When you create a secret, you see two columns:
  - **Secret ID**: `12345678-1234-1234-1234-123456789012` ❌ DON'T USE THIS
  - **Value**: `Ab1~cD2EfG3HiJ4KlM5NoP6QrS7TuV8Wx9YzA0` ✅ USE THIS

### 2. Special Characters in Secret

**Problem**: The secret contains special characters that need escaping.

**Solution**: In your `.env.local` file, wrap the secret in double quotes:
```
AZURE_AD_CLIENT_SECRET="Ab1~cD2+EfG3/Hi4="
```

### 3. Multiple Active Secrets

**Problem**: Having multiple client secrets can cause issues.

**Solution**:
1. Delete all existing secrets in Azure Portal
2. Create ONE new secret
3. Copy the value immediately (you can't see it later)
4. Update `.env.local` with the new secret

### 4. Secret Has Expired

**Problem**: Client secrets expire after the duration you set.

**Solution**: Create a new secret in Azure Portal.

## Step-by-Step Fix Process

### On Your Local Machine:

1. **Commit and push the fixes**:
   ```bash
   git add -A
   git commit -m "Fix Azure AD authentication issues"
   git push origin main
   ```

### On Your Server:

1. **SSH to your server** and pull the changes:
   ```bash
   cd /home/ubuntu/intranet
   git pull
   ```

2. **Run the fix script**:
   ```bash
   chmod +x fix-auth-production.sh
   ./fix-auth-production.sh
   ```

3. **Edit the environment file**:
   ```bash
   nano .env.local.template
   ```
   - Add your Azure AD client secret VALUE
   - Generate a random NEXTAUTH_SECRET: `openssl rand -base64 32`

4. **Copy to .env.local**:
   ```bash
   cp .env.local.template .env.local
   ```

5. **Verify environment**:
   ```bash
   node verify-env.js
   ```

6. **Test Azure AD authentication**:
   ```bash
   node test-azure-auth.js
   ```

7. **If tests pass, rebuild and restart**:
   ```bash
   npm run build
   pm2 stop intranet-app
   pm2 delete intranet-app
   pm2 start ecosystem.config.js
   ```

8. **Check logs**:
   ```bash
   pm2 logs intranet-app --lines 50
   ```

## Verification

After deployment, check:
1. Auth health: `https://10.152.8.77/api/auth-health`
2. Try signing in at: `https://10.152.8.77`

## If Still Having Issues

1. **Enable debug mode** by adding to `.env.local`:
   ```
   NEXTAUTH_DEBUG=true
   ```

2. **Check detailed logs**:
   ```bash
   pm2 logs intranet-app --err --lines 200
   ```

3. **Create a new secret** in Azure AD and try again

4. **Ensure nginx is not interfering** with headers or cookies

## Important Notes

- The client secret VALUE is what you need, not the ID
- Secrets are only visible when first created in Azure Portal
- Special characters in secrets should be properly quoted
- Having multiple active secrets can cause authentication failures
- Rate limiting has been relaxed to prevent lockouts during testing