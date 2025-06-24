import { getServerSession } from 'next-auth/next'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/User.Read.All'
        }
      }
    }),
  ],
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
        try {
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
              scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/User.Read.All',
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
          console.log('✅ Token refreshed successfully')
        } catch (error) {
          console.error('❌ Error refreshing token:', error instanceof Error ? error.message : error)

          // Clear token data to force re-authentication
          // This is safer than returning an expired token
          token.accessToken = undefined
          token.refreshToken = undefined
          token.expiresAt = undefined
          token.error = "RefreshAccessTokenError"
        }
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
}

export const getAuthSession = () => getServerSession(authOptions)
