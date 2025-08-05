#!/bin/bash

echo "Installing Prisma client locally..."

# Create the @prisma directory in node_modules
mkdir -p node_modules/@prisma

# Copy the client files
if [ -d "prisma-client-backup" ]; then
    # Remove existing client if it exists
    rm -rf node_modules/@prisma/client
    # Copy the complete client
    cp -r prisma-client-backup node_modules/@prisma/client
    echo "Prisma client installed from backup"
    
    # Verify the installation
    if [ -f "node_modules/@prisma/client/package.json" ]; then
        echo "✓ Package.json found"
    fi
    
    if [ -f "node_modules/@prisma/client/index.js" ]; then
        echo "✓ Main module found"
    fi
    
    if [ -f "node_modules/@prisma/client/default.js" ]; then
        echo "✓ Default export found"
    fi
    
else
    echo "❌ Backup not found!"
    exit 1
fi

echo "✓ Installation complete!"