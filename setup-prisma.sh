#!/bin/bash

echo "Setting up Prisma client for deployment..."

# Create node_modules/@prisma directory if it doesn't exist
mkdir -p node_modules/@prisma

# Check if prisma-client-backup exists and copy it
if [ -d "prisma-client-backup" ]; then
    echo "Copying Prisma client from backup..."
    cp -r prisma-client-backup node_modules/@prisma/client
    echo "Prisma client copied successfully!"
else
    echo "Prisma client backup not found. Trying to generate..."
    # Try to generate using existing prisma installation
    if command -v npx &> /dev/null; then
        npx prisma generate
    else
        echo "npx not available. Please install packages first."
        exit 1
    fi
fi

echo "Prisma setup complete!"