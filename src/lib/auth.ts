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
          scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All'
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Log the token state for debugging
      console.log('[Auth] JWT callback called', {
        hasAccount: !!account,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        tokenExpiry: token.expiresAt ? new Date(token.expiresAt * 1000).toISOString() : 'none',
        now: new Date().toISOString()
      });

      if (account) {
        console.log('[Auth] New account credentials received, updating token');
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Check if token is expired and refresh it
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        console.log('[Auth] Token is still valid, no refresh needed');
        return token
      }

      console.log('[Auth] Token is expired or missing expiry, attempting refresh');

      // Verify environment variables before attempting refresh
      if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
        console.error('[Auth] CRITICAL: Missing required environment variables for token refresh', {
          clientIdExists: !!process.env.AZURE_AD_CLIENT_ID,
          clientSecretExists: !!process.env.AZURE_AD_CLIENT_SECRET,
          tenantIdExists: !!process.env.AZURE_AD_TENANT_ID,
          timestamp: new Date().toISOString()
        });

        // Return the token as is, but mark it as having refresh errors
        token.error = 'missing_env_vars';
        return token;
      }

      // Token is expired, try to refresh it
      if (token.refreshToken) {
        try {
          console.log('[Auth] Attempting to refresh token with refresh token');

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
              scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All',
            }),
          })

          if (response.ok) {
            try {
              const refreshedTokens = await response.json()
              token.accessToken = refreshedTokens.access_token
              token.refreshToken = refreshedTokens.refresh_token || token.refreshToken
              token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in

              // Clear any previous errors
              delete token.error;

              console.log('✅ [Auth] Token refreshed successfully', {
                newExpiryTime: new Date(token.expiresAt * 1000).toISOString(),
                tokenType: refreshedTokens.token_type || 'unknown'
              });
            } catch (jsonError) {
              console.error('❌ [Auth] Error parsing token response JSON:', {
                error: jsonError instanceof Error ? jsonError.message : 'Unknown error',
                stack: jsonError instanceof Error ? jsonError.stack : 'No stack trace',
                timestamp: new Date().toISOString()
              });

              // Mark token as having refresh errors
              token.error = 'json_parse_error';
            }
          } else {
            // Try to get error details
            try {
              const errorText = await response.text();
              console.error('❌ [Auth] Failed to refresh token:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText.substring(0, 500), // Limit text length
                timestamp: new Date().toISOString()
              });

              // Mark token as having refresh errors
              token.error = `refresh_failed_${response.status}`;
            } catch (textError) {
              console.error('❌ [Auth] Failed to refresh token and could not get error details:', {
                status: response.status,
                error: textError instanceof Error ? textError.message : 'Unknown error',
                timestamp: new Date().toISOString()
              });

              // Mark token as having refresh errors
              token.error = `refresh_failed_${response.status}_no_details`;
            }
          }
        } catch (error) {
          console.error('❌ [Auth] Error during token refresh process:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
          });

          // Mark token as having refresh errors
          token.error = 'refresh_process_error';
        }
      } else {
        console.error('[Auth] Cannot refresh token: No refresh token available');
        token.error = 'no_refresh_token';
      }

      // Log the final token state
      console.log('[Auth] Returning token from JWT callback', {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        hasError: !!token.error,
        errorType: token.error || 'none',
        timestamp: new Date().toISOString()
      });

      return token
    },
    async session({ session, token }) {
      console.log('[Auth] Session callback called', {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        hasError: !!token.error,
        timestamp: new Date().toISOString()
      });

      // Transfer token data to session
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number

      // If there's an error in the token, add it to the session
      if (token.error) {
        session.error = token.error as string
        console.warn('[Auth] Token error transferred to session:', token.error);
      }

      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
}

export const getAuthSession = async () => {
  try {
    console.log('[Auth] Getting server session...');

    // Check for required environment variables before attempting to get session
    if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
      console.error('[Auth] CRITICAL: Missing required environment variables for Azure AD authentication', {
        clientIdExists: !!process.env.AZURE_AD_CLIENT_ID,
        clientSecretExists: !!process.env.AZURE_AD_CLIENT_SECRET,
        tenantIdExists: !!process.env.AZURE_AD_TENANT_ID,
        timestamp: new Date().toISOString()
      });

      // Instead of throwing, return null with error information
      return {
        error: 'missing_env_vars',
        errorDescription: 'Missing required environment variables for authentication',
        errorTime: new Date().toISOString()
      };
    }

    // Check for NEXTAUTH_SECRET which is required for session encryption
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[Auth] CRITICAL: Missing NEXTAUTH_SECRET environment variable', {
        timestamp: new Date().toISOString()
      });

      return {
        error: 'missing_nextauth_secret',
        errorDescription: 'Missing NEXTAUTH_SECRET environment variable required for session encryption',
        errorTime: new Date().toISOString()
      };
    }

    // Check for NEXTAUTH_URL which is recommended for production
    if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
      console.warn('[Auth] WARNING: Missing NEXTAUTH_URL environment variable in production', {
        timestamp: new Date().toISOString()
      });
      // Don't return an error for this, just log a warning
    }

    try {
      const session = await getServerSession(authOptions);

      if (session) {
        console.log('[Auth] Session retrieved successfully', {
          user: session.user?.email || 'unknown',
          hasAccessToken: !!session.accessToken,
          hasRefreshToken: !!session.refreshToken,
          hasError: !!session.error,
          timestamp: new Date().toISOString()
        });

        // If session has an error, log it but still return the session
        if (session.error) {
          console.warn('[Auth] Session contains error:', session.error);
        }
      } else {
        console.log('[Auth] No session found');
      }

      return session;
    } catch (sessionError) {
      // This is a specific error from getServerSession
      const errorTime = new Date().toISOString();
      console.error('[Auth] Error from getServerSession:', {
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
        stack: sessionError instanceof Error ? sessionError.stack : 'No stack trace',
        timestamp: errorTime
      });

      return {
        error: 'get_server_session_error',
        errorDescription: sessionError instanceof Error ? sessionError.message : 'Error retrieving session from NextAuth',
        errorTime
      };
    }
  } catch (error) {
    // This is a general error in the getAuthSession function
    const errorTime = new Date().toISOString();
    console.error('[Auth] Unexpected error in getAuthSession:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: errorTime
    });

    // Instead of re-throwing, return null with error information
    // This prevents 500 errors in API routes that use getAuthSession
    return {
      error: 'unexpected_auth_error',
      errorDescription: error instanceof Error ? error.message : 'Unexpected error in authentication process',
      errorTime
    };
  }
}
