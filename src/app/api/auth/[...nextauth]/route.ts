import NextAuth from 'next-auth'
// Temporarily use simplified auth to diagnose timeout issues
import { authOptions } from '@/lib/auth-simple'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }