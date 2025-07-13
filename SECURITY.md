# Security Configuration

## Overview
This document outlines the security measures implemented in the Flyadeal Intranet application.

## Security Headers ✅

The following security headers are configured in `next.config.js`:

- **X-Frame-Options**: `SAMEORIGIN` - Prevents clickjacking attacks
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-XSS-Protection**: `1; mode=block` - Enables XSS filtering
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` - Enforces HTTPS
- **Content-Security-Policy**: Restricts resource loading to trusted sources
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controls referrer information
- **Permissions-Policy**: Restricts browser features (camera, microphone, etc.)

## Rate Limiting ✅

Rate limiting is implemented using `rate-limiter-flexible` in `src/lib/rate-limit.ts`:

- **API endpoints**: 100 requests per minute
- **Authentication**: 5 attempts per 5 minutes (15-minute block)
- **Weather API**: 60 requests per hour
- **Admin endpoints**: 50 requests per minute
- **General pages**: 200 requests per minute

## Input Sanitization ✅

- HTML content is sanitized using DOMPurify (`src/lib/sanitize.ts`)
- Newsletter content is sanitized before rendering
- External links automatically get `rel="noopener noreferrer"`

## Authentication & Authorization ✅

- Azure AD authentication via NextAuth.js
- Session cookies use `sameSite: strict` and `secure: true`
- Sessions expire after 8 hours (reduced from 30 days)
- Role-based access control for admin features

## Database Security ✅

- All SQL queries use parameterized statements
- No string concatenation in queries
- SQLite database with proper access controls

## CORS Policy ✅

- Restricted to specific allowed origins (no wildcards)
- API routes only accept requests from:
  - `https://172.22.58.184:8443`
  - `http://localhost:3001`
  - Configured `NEXTAUTH_URL`

## Environment Variables ✅

- All sensitive data stored in environment variables
- No hardcoded API keys or secrets in source code
- `.env.local` is gitignored

## Additional Recommendations

1. **Logging & Monitoring**
   - Implement security event logging
   - Monitor failed authentication attempts
   - Set up alerts for suspicious activities

2. **Regular Updates**
   - Keep all dependencies updated
   - Run `npm audit` regularly
   - Subscribe to security advisories

3. **Production Deployment**
   - Ensure HTTPS is enforced
   - Use strong SSL/TLS configuration
   - Implement proper backup strategies

4. **Code Reviews**
   - Regular security code reviews
   - Penetration testing before major releases
   - Security training for development team

## Security Checklist

- [x] No npm vulnerabilities (`npm audit` shows 0)
- [x] HTML sanitization for user content
- [x] Security headers configured
- [x] Rate limiting implemented
- [x] CORS properly restricted
- [x] Session security hardened
- [x] SQL injection protection
- [x] XSS protection
- [x] No hardcoded secrets

## Contact

For security concerns or to report vulnerabilities, please contact the IT Security team.