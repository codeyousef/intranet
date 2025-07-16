#!/bin/bash

echo "=== NextAuth Final Fix Script ==="
echo ""
echo "Since direct Azure AD authentication works, the issue is with NextAuth configuration."
echo ""

# Step 1: Backup current .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up current .env.local"
fi

# Step 2: Check and fix .env.local formatting
echo ""
echo "Checking .env.local for formatting issues..."

# Remove BOM if present
if head -c 3 .env.local | grep -q $'\xef\xbb\xbf' 2>/dev/null; then
    echo "  ⚠️  Found UTF-8 BOM, removing..."
    sed -i '1s/^\xEF\xBB\xBF//' .env.local
    echo "  ✅ Removed BOM"
fi

# Convert to Unix line endings
if file .env.local | grep -q "CRLF" 2>/dev/null; then
    echo "  ⚠️  Found Windows line endings, converting..."
    dos2unix .env.local 2>/dev/null || sed -i 's/\r$//' .env.local
    echo "  ✅ Converted to Unix line endings"
fi

# Step 3: Extract current values
echo ""
echo "Extracting current configuration..."

# Function to extract value without quotes
extract_value() {
    local key=$1
    local value=$(grep "^${key}=" .env.local | cut -d'=' -f2-)
    # Remove surrounding quotes if present
    value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
    echo "$value"
}

CURRENT_CLIENT_SECRET=$(extract_value "AZURE_AD_CLIENT_SECRET")
CURRENT_NEXTAUTH_SECRET=$(extract_value "NEXTAUTH_SECRET")

# Step 4: Generate new NEXTAUTH_SECRET if needed
if [ -z "$CURRENT_NEXTAUTH_SECRET" ] || [ ${#CURRENT_NEXTAUTH_SECRET} -lt 32 ]; then
    echo ""
    echo "Generating new NEXTAUTH_SECRET..."
    NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
else
    NEW_NEXTAUTH_SECRET="$CURRENT_NEXTAUTH_SECRET"
fi

# Step 5: Create optimized .env.local
echo ""
echo "Creating optimized .env.local..."

cat > .env.local.new << EOF
NODE_ENV=production
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=${NEW_NEXTAUTH_SECRET}

AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=${CURRENT_CLIENT_SECRET}
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=${CURRENT_CLIENT_SECRET}
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

DATABASE_URL=file:./intranet.db
EOF

# Step 6: Apply the new configuration
echo ""
echo "Applying new configuration..."
mv .env.local.new .env.local

# Step 7: Update auth.ts to handle token properly
echo ""
echo "Updating auth.ts with proper token handling..."

cat > src/lib/auth.ts.new << 'EOF'
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
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          user,
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, return previous token
      // NextAuth will handle re-authentication
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
EOF

# Backup original and apply new auth.ts
cp src/lib/auth.ts src/lib/auth.ts.backup.$(date +%Y%m%d_%H%M%S)
mv src/lib/auth.ts.new src/lib/auth.ts

# Step 8: Clear all caches and rebuild
echo ""
echo "Clearing caches and rebuilding..."

# Clear Next.js cache
rm -rf .next/cache

# Clear node_modules cache
rm -rf node_modules/.cache

# Clear PM2 logs
pm2 flush

# Step 9: Rebuild application
echo ""
echo "Rebuilding application..."
npm run build

# Step 10: Restart PM2
echo ""
echo "Restarting PM2..."
pm2 restart intranet-app

# Step 11: Show diagnostics
echo ""
echo "=== Final Diagnostics ==="
echo ""
echo "1. Test authentication:"
echo "   - Visit: https://10.152.8.77"
echo "   - Click 'Sign in with Azure AD'"
echo ""
echo "2. Check logs:"
echo "   pm2 logs intranet-app --lines 50"
echo ""
echo "3. Test endpoints:"
echo "   curl -k https://10.152.8.77/api/auth/providers"
echo "   curl -k https://10.152.8.77/api/auth-health"
echo ""
echo "4. If still failing:"
echo "   - Check browser console for errors"
echo "   - Check network tab for failed requests"
echo "   - Run: ./debug-nextauth-issue.js"
echo ""
echo "✅ NextAuth fix applied!"
EOF

chmod +x fix-nextauth-final.sh

# Backup and apply
mv src/lib/auth.ts src/lib/auth.ts.backup.nextauth
mv src/lib/auth.ts.new src/lib/auth.ts