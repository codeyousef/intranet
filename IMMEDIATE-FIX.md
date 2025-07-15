# Immediate Fix for Rate Limiting Issue

## The Problem
The app is stuck in an authentication loop:
1. App checks session → Gets rate limited (429)
2. Thinks user is not authenticated → Shows login
3. User signs in → Redirects back
4. App checks session again → Rate limited again
5. Loop continues...

## Root Cause
All users appear to come from the same IP address (likely nginx or a load balancer), so they share the same rate limit bucket in memory.

## Quick Fix (Deploy These Changes)

### 1. Update Rate Limiter to Use Session-Based Identification

In `src/lib/rate-limit.ts`, the rate limiter needs to distinguish between different users better. The current implementation tries to do this but might not be working correctly in production.

### 2. Increase Auth Rate Limits

Change the auth rate limiter from:
```typescript
auth: new RateLimiterMemory({
  points: 10, // 10 attempts
  duration: 300, // Per 5 minutes
  blockDuration: 300, // Block for 5 minutes
}),
```

To:
```typescript
auth: new RateLimiterMemory({
  points: 100, // Increased to 100 attempts
  duration: 60, // Per 1 minute
  blockDuration: 60, // Block for only 1 minute
}),
```

### 3. Emergency Deployment Steps

```bash
# On your server
cd /home/ubuntu/intranet

# Pull the latest changes
git pull

# Clear PM2 logs
pm2 flush

# Stop the app
pm2 stop intranet-app

# Build
npm run build

# Start with increased memory (to handle rate limit storage)
pm2 start ecosystem.config.js --update-env

# Monitor logs
pm2 logs intranet-app --lines 100
```

### 4. Test the Fix

1. Visit: https://10.152.8.77
2. Try to sign in
3. Check logs for rate limit errors

### 5. Long-term Solution

Consider using Redis for rate limiting instead of in-memory storage:
- Install Redis on the server
- Use `rate-limiter-flexible` with Redis adapter
- This allows rate limits to be shared across multiple instances

## Alternative: Temporary Disable Rate Limiting

If the above doesn't work, temporarily disable rate limiting:

1. Comment out the rate limiting in `src/middleware.ts`
2. Deploy
3. Fix the underlying issue
4. Re-enable rate limiting