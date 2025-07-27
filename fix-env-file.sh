#!/bin/bash

echo "=== Environment File Fix Script ==="
echo "This script will fix your .env.local file with correct production settings"
echo ""

# Backup existing .env.local
if [ -f .env.local ]; then
    BACKUP_FILE=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env.local "$BACKUP_FILE"
    echo "✅ Backed up existing .env.local to $BACKUP_FILE"
else
    echo "⚠️  No existing .env.local found - creating new one"
fi

# Function to extract value from env file, removing quotes
extract_env_value() {
    local key=$1
    local file=${2:-.env.local}
    if [ -f "$file" ]; then
        grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
    fi
}

# Extract existing values if they exist
echo ""
echo "Extracting existing configuration..."

EXISTING_AZURE_SECRET=$(extract_env_value "AZURE_AD_CLIENT_SECRET")
EXISTING_WEATHER_API=$(extract_env_value "WEATHER_API_KEY")
EXISTING_NEXTAUTH_SECRET=$(extract_env_value "NEXTAUTH_SECRET")

# Show what we found
if [ -n "$EXISTING_AZURE_SECRET" ]; then
    echo "   ✅ Found Azure AD secret (length: ${#EXISTING_AZURE_SECRET})"
else
    echo "   ⚠️  No Azure AD secret found - you'll need to add it"
fi

if [ -n "$EXISTING_WEATHER_API" ]; then
    echo "   ✅ Found Weather API key"
else
    echo "   ⚠️  No Weather API key found"
fi

# Generate new NEXTAUTH_SECRET if needed
if [ -z "$EXISTING_NEXTAUTH_SECRET" ] || [ ${#EXISTING_NEXTAUTH_SECRET} -lt 32 ]; then
    echo "   🔄 Generating new NEXTAUTH_SECRET..."
    NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
else
    echo "   ✅ Using existing NEXTAUTH_SECRET"
    NEW_NEXTAUTH_SECRET="$EXISTING_NEXTAUTH_SECRET"
fi

# Use default values if not found
AZURE_SECRET=${EXISTING_AZURE_SECRET:-"REPLACE_WITH_YOUR_AZURE_SECRET"}
WEATHER_KEY=${EXISTING_WEATHER_API:-"7b780a57ff2c4e11afa104921250402"}

echo ""
echo "Creating optimized .env.local file..."

# Create the new .env.local file
cat > .env.local << EOF
# Production Environment
NODE_ENV=production

# NextAuth Configuration
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=$NEW_NEXTAUTH_SECRET

# Microsoft Azure AD Configuration
AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=$AZURE_SECRET
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Power BI Configuration  
POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=$AZURE_SECRET
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

# Database Configuration
DATABASE_URL=file:./intranet.db

# Weather API Configuration
WEATHER_API_KEY=$WEATHER_KEY

# Development Settings (for Netskope bypass)
NODE_TLS_REJECT_UNAUTHORIZED=0
EOF

echo "✅ Created new .env.local file"

# Check for common issues
echo ""
echo "Checking for potential issues..."

# Check file encoding
if command -v file >/dev/null 2>&1; then
    FILE_INFO=$(file .env.local)
    if echo "$FILE_INFO" | grep -q "CRLF"; then
        echo "   ⚠️  WARNING: File has Windows line endings, converting..."
        if command -v dos2unix >/dev/null 2>&1; then
            dos2unix .env.local
            echo "   ✅ Converted to Unix line endings"
        else
            sed -i 's/\r$//' .env.local
            echo "   ✅ Converted to Unix line endings (using sed)"
        fi
    fi
fi

# Check for BOM
if head -c 3 .env.local | grep -q $'\xef\xbb\xbf' 2>/dev/null; then
    echo "   ⚠️  WARNING: File has UTF-8 BOM, removing..."
    sed -i '1s/^\xEF\xBB\xBF//' .env.local
    echo "   ✅ Removed BOM"
fi

# Verify the Azure secret
if [ "$AZURE_SECRET" = "REPLACE_WITH_YOUR_AZURE_SECRET" ]; then
    echo ""
    echo "❌ IMPORTANT: You need to add your Azure AD Client Secret!"
    echo ""
    echo "1. Go to Azure Portal > Azure Active Directory > App registrations"
    echo "2. Find app: a1d4e237-dc24-4670-98fa-7a8bb45e5fca"
    echo "3. Go to: Certificates & secrets"
    echo "4. Copy the SECRET VALUE (not the Secret ID!)"
    echo "5. Replace REPLACE_WITH_YOUR_AZURE_SECRET in .env.local"
    echo ""
    echo "Then run: npm run build && pm2 restart intranet-app"
else
    # Validate the secret format
    if [[ "$AZURE_SECRET" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
        echo ""
        echo "❌ ERROR: Azure secret looks like a UUID/Secret ID!"
        echo "   You need the SECRET VALUE, not the Secret ID"
        echo "   Go to Azure Portal and copy the VALUE column"
    else
        echo "   ✅ Azure secret format looks correct"
    fi
fi

echo ""
echo "=== Environment File Summary ==="
echo "✅ NODE_ENV: production"
echo "✅ NEXTAUTH_URL: https://10.152.8.77"
echo "✅ NEXTAUTH_SECRET: $([ ${#NEW_NEXTAUTH_SECRET} -ge 32 ] && echo "Strong (${#NEW_NEXTAUTH_SECRET} chars)" || echo "Weak")"
echo "✅ Azure AD Client ID: a1d4e237-dc24-4670-98fa-7a8bb45e5fca"
echo "$([ "$AZURE_SECRET" != "REPLACE_WITH_YOUR_AZURE_SECRET" ] && echo "✅" || echo "❌") Azure AD Secret: $([ "$AZURE_SECRET" != "REPLACE_WITH_YOUR_AZURE_SECRET" ] && echo "Set (${#AZURE_SECRET} chars)" || echo "NEEDS TO BE SET")"

echo ""
echo "=== Next Steps ==="
if [ "$AZURE_SECRET" = "REPLACE_WITH_YOUR_AZURE_SECRET" ]; then
    echo "1. ❌ Add your Azure AD Client Secret to .env.local"
    echo "2. Then run: npm run build"
    echo "3. Then run: pm2 restart intranet-app"
else
    echo "1. ✅ Run: npm run build"
    echo "2. ✅ Run: pm2 restart intranet-app"
    echo "3. ✅ Test: Visit https://10.152.8.77 and try signing in"
    echo "4. ✅ Debug: pm2 logs intranet-app --lines 20"
fi

echo ""
echo "Environment file fix complete!"