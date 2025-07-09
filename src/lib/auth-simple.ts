import { getServerSession } from 'next-auth/next'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  // Disable debug mode to prevent warnings
  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  // Simplified callbacks without token refresh
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Only include essential data to reduce cookie size
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
}

export const getAuthSession = () => getServerSession(authOptions)