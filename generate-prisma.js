#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking if Prisma client needs to be generated...');

// Check if @prisma/client exists in node_modules
const prismaClientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');

if (!fs.existsSync(prismaClientPath)) {
  console.log('Prisma client not found. Attempting to generate...');
  
  try {
    // Try to use npx first
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Prisma client generated successfully with npx!');
  } catch (error) {
    console.log('npx failed, trying alternative approach...');
    
    try {
      // Try using node_modules/.bin/prisma directly
      const prismaBin = path.join(__dirname, 'node_modules', '.bin', 'prisma');
      if (fs.existsSync(prismaBin)) {
        execSync(`${prismaBin} generate`, { stdio: 'inherit' });
        console.log('Prisma client generated successfully!');
      } else {
        console.error('Prisma binary not found. Using backup installation...');
        // Use our backup installation script
        execSync('./install-prisma-local.sh', { stdio: 'inherit' });
        console.log('Prisma client installed from backup!');
      }
    } catch (error2) {
      console.error('Failed to generate Prisma client:', error2.message);
      process.exit(1);
    }
  }
} else {
  console.log('Prisma client already exists. Skipping generation.');
}