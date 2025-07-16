#!/bin/bash

echo "=== Environment Variable Issue Checker ==="
echo ""

# Function to check for hidden characters
check_hidden_chars() {
    local file=$1
    echo "Checking $file for hidden characters..."
    
    # Check for BOM
    if head -c 3 "$file" | grep -q $'\xef\xbb\xbf'; then
        echo "  ⚠️  WARNING: File has UTF-8 BOM (Byte Order Mark)"
        echo "  Fix with: sed -i '1s/^\xEF\xBB\xBF//' $file"
    fi
    
    # Check for Windows line endings
    if file "$file" | grep -q "CRLF"; then
        echo "  ⚠️  WARNING: File has Windows line endings (CRLF)"
        echo "  Fix with: dos2unix $file"
    fi
    
    # Check for non-ASCII characters
    if grep -P '[^\x00-\x7F]' "$file" > /dev/null 2>&1; then
        echo "  ⚠️  WARNING: File contains non-ASCII characters"
        echo "  Lines with non-ASCII:"
        grep -n -P '[^\x00-\x7F]' "$file" | head -5
    fi
}

# Create a clean .env.local template
cat > .env.local.clean << 'EOF'
NODE_ENV=production
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=REPLACE_WITH_RANDOM_SECRET

AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=REPLACE_WITH_SECRET_VALUE
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=REPLACE_WITH_SECRET_VALUE
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

DATABASE_URL=file:./intranet.db
NEXTAUTH_DEBUG=true
EOF

echo "1. Checking existing .env.local file..."
if [ -f .env.local ]; then
    check_hidden_chars .env.local
    
    # Extract and check the secret
    echo ""
    echo "2. Extracting Azure AD Client Secret..."
    SECRET=$(grep "^AZURE_AD_CLIENT_SECRET=" .env.local | cut -d'=' -f2-)
    
    if [ -z "$SECRET" ]; then
        echo "  ❌ No AZURE_AD_CLIENT_SECRET found!"
    else
        # Remove quotes if present
        SECRET=$(echo "$SECRET" | sed 's/^"//' | sed 's/"$//')
        
        echo "  Secret length: ${#SECRET}"
        echo "  First 4 chars: ${SECRET:0:4}"
        echo "  Last 4 chars: ${SECRET: -4}"
        
        # Check for common issues
        if [[ "$SECRET" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
            echo "  ❌ ERROR: This is a UUID/Secret ID, not a secret value!"
        fi
        
        if [[ "$SECRET" == *" "* ]]; then
            echo "  ⚠️  WARNING: Secret contains spaces"
        fi
        
        if [[ ${#SECRET} -lt 20 ]]; then
            echo "  ⚠️  WARNING: Secret seems too short"
        fi
    fi
else
    echo "  ❌ No .env.local file found!"
fi

echo ""
echo "3. Creating sanitized environment file..."
echo ""
echo "Please provide the following values:"
echo ""

# Get NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET (press Enter to generate random):"
read -r NEXTAUTH_SECRET_INPUT
if [ -z "$NEXTAUTH_SECRET_INPUT" ]; then
    NEXTAUTH_SECRET_INPUT=$(openssl rand -base64 32)
    echo "Generated: $NEXTAUTH_SECRET_INPUT"
fi

# Get Azure AD Client Secret
echo ""
echo "AZURE_AD_CLIENT_SECRET (paste the VALUE from Azure Portal):"
echo "IMPORTANT: Copy the VALUE column, not the Secret ID!"
read -rs AZURE_CLIENT_SECRET_INPUT
echo ""

# Create the final .env.local
cat > .env.local.new << EOF
NODE_ENV=production
NEXTAUTH_URL=https://10.152.8.77
NEXTAUTH_SECRET=$NEXTAUTH_SECRET_INPUT

AZURE_AD_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
AZURE_AD_CLIENT_SECRET=$AZURE_CLIENT_SECRET_INPUT
AZURE_AD_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

POWERBI_CLIENT_ID=a1d4e237-dc24-4670-98fa-7a8bb45e5fca
POWERBI_CLIENT_SECRET=$AZURE_CLIENT_SECRET_INPUT
POWERBI_TENANT_ID=6b8805cf-83d0-4342-bd38-fb3b3df952be

DATABASE_URL=file:./intranet.db
NEXTAUTH_DEBUG=true
EOF

# Ensure no BOM or CRLF
dos2unix .env.local.new 2>/dev/null || true

echo ""
echo "4. New environment file created: .env.local.new"
echo ""
echo "5. Testing the new configuration..."
echo ""

# Test with the new values
export AZURE_AD_CLIENT_ID="a1d4e237-dc24-4670-98fa-7a8bb45e5fca"
export AZURE_AD_CLIENT_SECRET="$AZURE_CLIENT_SECRET_INPUT"
export AZURE_AD_TENANT_ID="6b8805cf-83d0-4342-bd38-fb3b3df952be"

node debug-auth-issue.js

echo ""
echo "6. If the test passed:"
echo "   mv .env.local .env.local.backup"
echo "   mv .env.local.new .env.local"
echo "   npm run build"
echo "   pm2 restart intranet-app"
echo ""
echo "7. If the test failed:"
echo "   - Double-check you're copying the SECRET VALUE from Azure"
echo "   - Try creating a new secret in Azure Portal"
echo "   - Run: ./check-azure-app.sh for more checks"