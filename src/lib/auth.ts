import { getServerSession } from 'next-auth/next'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { NextAuthOptions } from 'next-auth'

// Token refresh tracking
const tokenRefreshAttempts = new Map<string, { count: number; lastAttempt: number; nextAllowedAttempt: number }>()

export const authOptions: NextAuthOptions = {
  // Enable debug mode temporarily to diagnose issues
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  // Set the secret explicitly to ensure it's used for CSRF token generation
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access'
        }
      }
    }),
  ],
  // Add explicit cookie configuration to handle cross-domain issues
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Changed to lax to allow redirects
        path: '/',
        secure: true, // Always use secure cookies
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Changed to lax to allow redirects
        path: '/',
        secure: true, // Always use secure cookies
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Changed to lax to allow redirects
        path: '/',
        secure: true, // Always use secure cookies
      },
    },
  },
  // Add session configuration with shorter expiration
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours (reduced from 30 days)
    updateAge: 60 * 60, // Update session every hour
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Check if token is expired and refresh it
      // token.expiresAt is in seconds since epoch, so we need to multiply by 1000 to get milliseconds
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token
      }

      // Token is expired, try to refresh it
      if (token.refreshToken) {
        const tokenKey = token.sub || 'default'
        const now = Date.now()
        const attemptInfo = tokenRefreshAttempts.get(tokenKey) || { count: 0, lastAttempt: 0, nextAllowedAttempt: 0 }
        
        // Check if we're still in cooldown period
        if (now < attemptInfo.nextAllowedAttempt) {
          console.log(`⏳ Token refresh cooldown for ${tokenKey}, next attempt allowed at ${new Date(attemptInfo.nextAllowedAttempt).toISOString()}`)
          // Return token with error flag to prevent immediate retries
          token.error = "RefreshCooldown"
          return token
        }
        
        // Calculate exponential backoff: 2^attempt seconds, max 5 minutes
        const backoffSeconds = Math.min(Math.pow(2, attemptInfo.count), 300)
        const nextAllowedAttempt = now + (backoffSeconds * 1000)
        try {
          // Update attempt tracking
          attemptInfo.count++
          attemptInfo.lastAttempt = now
          attemptInfo.nextAllowedAttempt = nextAllowedAttempt
          tokenRefreshAttempts.set(tokenKey, attemptInfo)
          
          console.log(`🔄 Attempting token refresh for ${tokenKey} (attempt ${attemptInfo.count})`)
          
          const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.AZURE_AD_CLIENT_ID!,
              client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
              scope: 'openid profile email offline_access',
            }),
          })

          // Check if response is OK and has JSON content
          const contentType = response.headers.get('content-type')
          if (!response.ok) {
            throw new Error(`Token refresh failed with status ${response.status}: ${response.statusText}`)
          }

          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Token refresh returned non-JSON response: ${contentType}`)
          }

          const refreshedTokens = await response.json()

          if (!refreshedTokens.access_token) {
            throw new Error('Token refresh response missing access_token')
          }

          token.accessToken = refreshedTokens.access_token
          token.refreshToken = refreshedTokens.refresh_token || token.refreshToken
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
          
          // Reset attempt tracking on success
          tokenRefreshAttempts.delete(tokenKey)
          delete token.error
          
          console.log('✅ Token refreshed successfully')
        } catch (error) {
          console.error(`❌ Error refreshing token (attempt ${attemptInfo.count}):`, error instanceof Error ? error.message : error)
          console.error(`⏱️ Next retry allowed at: ${new Date(attemptInfo.nextAllowedAttempt).toISOString()}`)

          // Don't immediately clear tokens - mark as error state instead
          token.error = "RefreshAccessTokenError"
          
          // Clear tokens only after max attempts (5)
          if (attemptInfo.count >= 5) {
            console.error('❌ Max refresh attempts reached, clearing tokens')
            token.accessToken = undefined
            token.refreshToken = undefined
            token.expiresAt = undefined
            tokenRefreshAttempts.delete(tokenKey)
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Only include essential data in session to reduce cookie size
      // Access token is needed for API calls but refresh token should stay in JWT only
      session.accessToken = token.accessToken as string
      session.expiresAt = token.expiresAt as number
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  // Add event handlers for better error tracking
  events: {
    async signIn({ user, account, profile }) {
      console.log('[NextAuth] SignIn attempt', {
        timestamp: new Date().toISOString(),
        provider: account?.provider,
        userId: user?.id,
        hasProfile: !!profile
      });
    },
    async signOut({ token, session }) {
      console.log('[NextAuth] SignOut event triggered', {
        timestamp: new Date().toISOString(),
        tokenExists: !!token,
        sessionExists: !!session
      });
    },
    async error(error) {
      console.error('[NextAuth] Authentication error:', {
        timestamp: new Date().toISOString(),
        error: error.message,
        url: error.url
      });
    }
  },
  // Add session configuration to ensure it's properly cleared
  useSecureCookies: process.env.NODE_ENV === 'production',
}

export const getAuthSession = () => getServerSession(authOptions)
