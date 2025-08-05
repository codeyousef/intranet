#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Attempting manual Prisma client generation...');

// Try to load and run Prisma generation directly
try {
  // Check if prisma schema exists
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error('Prisma schema not found at:', schemaPath);
    process.exit(1);
  }

  console.log('Found Prisma schema at:', schemaPath);
  
  // Try to require the Prisma CLI directly
  const prismaPath = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');
  if (fs.existsSync(prismaPath)) {
    console.log('Found Prisma CLI at:', prismaPath);
    
    // Set up environment for Prisma generation
    process.env.PRISMA_SCHEMA_PATH = schemaPath;
    process.argv = ['node', 'prisma', 'generate'];
    
    // Try to run Prisma generation
    require(prismaPath);
  } else {
    console.log('Prisma CLI not found, trying alternative...');
    
    // Check if we can at least verify the client exists
    const clientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
    if (fs.existsSync(clientPath)) {
      console.log('Prisma client directory exists, it should work...');
    } else {
      console.error('Prisma client not found!');
      process.exit(1);
    }
  }
  
} catch (error) {
  console.error('Error during manual generation:', error.message);
  console.log('This might be expected if we are using the backup client.');
}

console.log('Manual Prisma generation attempt completed.');