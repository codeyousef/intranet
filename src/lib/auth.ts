import { getServerSession } from 'next-auth/next'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
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
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.user = user
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user = token.user as any
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
}

export const getAuthSession = () => getServerSession(authOptions)