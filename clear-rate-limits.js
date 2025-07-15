#!/usr/bin/env node

/**
 * Script to clear rate limits by restarting the server
 * Run this if users are stuck with rate limits
 */

const { exec } = require('child_process');

console.log('Clearing rate limits by restarting the server...\n');

// Kill any existing Node.js processes running the server
exec('pkill -f "node.*https-server.js" || true', (error) => {
  if (error && error.code !== 1) {
    console.error('Error killing existing server:', error);
  }
  
  console.log('Starting fresh server instance...');
  
  // Start the server again
  const server = exec('npm run dev:https', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  server.stdout?.pipe(process.stdout);
  server.stderr?.pipe(process.stderr);
  
  console.log('\nRate limits cleared! Server is restarting...');
  console.log('Users should now be able to access the site without rate limit issues.\n');
});