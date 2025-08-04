#!/usr/bin/env node

/**
 * Test script to list files in the CEO Newsletter folder
 */

const https = require('https');

// Ignore self-signed certificate errors
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Configuration
const config = {
  hostname: '172.22.58.184',
  port: 8443,
  path: '/api/sharepoint/list-newsletter-files',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': process.env.AUTH_COOKIE || ''
  }
};

console.log('=== CEO Newsletter Folder Test ===');
console.log('Testing endpoint:', `https://${config.hostname}:${config.port}${config.path}`);

if (!process.env.AUTH_COOKIE) {
  console.error('\n❌ ERROR: AUTH_COOKIE environment variable not set');
  console.log('\nPlease set AUTH_COOKIE with your session cookie:');
  console.log('1. Log into the application in your browser');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Go to Application/Storage > Cookies');
  console.log('4. Find and copy the next-auth.session-token cookie value');
  console.log('5. Run: AUTH_COOKIE="next-auth.session-token=YOUR_COOKIE_VALUE" node test-newsletter-folder.js');
  process.exit(1);
}

console.log('\nListing newsletter files in SharePoint...\n');

const req = https.request(config, (res) => {
  console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
  
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== Results ===');
    
    try {
      const jsonData = JSON.parse(data);
      
      if (jsonData.success) {
        console.log('\n✅ Successfully accessed SharePoint');
        
        // Show summary
        if (jsonData.summary) {
          console.log('\n=== Summary ===');
          console.log('Folders checked:', jsonData.summary.totalFoldersChecked);
          console.log('HTML files found:', jsonData.summary.totalHtmlFiles);
          console.log('Newsletter files found:', jsonData.summary.totalNewsletterFiles);
          console.log('Has CEO Newsletter folder:', jsonData.summary.hasCeoNewsletterFolder);
          console.log('Files in CEO Newsletter:', jsonData.summary.ceoNewsletterFileCount);
        }
        
        // Show CEO Newsletter contents
        if (jsonData.ceoNewsletterContents) {
          console.log('\n=== CEO Newsletter Folder Contents ===');
          jsonData.ceoNewsletterContents.forEach((file, index) => {
            console.log(`${index + 1}. ${file.name} (${file.folder ? 'folder' : 'file'})`);
            if (!file.folder && file.name.toLowerCase().includes('newsletter')) {
              console.log(`   ⭐ This looks like a newsletter file!`);
            }
          });
        }
        
        // Show all HTML files
        if (jsonData.allHtmlFiles && jsonData.allHtmlFiles.length > 0) {
          console.log('\n=== All HTML Files Found ===');
          jsonData.allHtmlFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.path}`);
            if (file.lastModified) {
              console.log(`   Last modified: ${new Date(file.lastModified).toLocaleDateString()}`);
            }
          });
        }
        
        // Show newsletter-related files
        if (jsonData.newsletterRelatedFiles && jsonData.newsletterRelatedFiles.length > 0) {
          console.log('\n=== Newsletter Related Files ===');
          jsonData.newsletterRelatedFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.path}`);
            console.log(`   Type: ${file.type}, Size: ${file.size} bytes`);
          });
        }
        
        // Show errors for specific folders
        console.log('\n=== Folder Access Results ===');
        for (const [folder, contents] of Object.entries(jsonData.filesFound)) {
          if (typeof contents === 'string' && contents.startsWith('Error:')) {
            console.log(`❌ ${folder}: ${contents}`);
          } else if (Array.isArray(contents)) {
            console.log(`✅ ${folder}: ${contents.length} items`);
          }
        }
        
      } else {
        console.log('❌ Failed to list newsletter files');
        console.log('Error:', jsonData.error);
        console.log('Details:', jsonData.details);
      }
      
      // Save full response for debugging
      const fs = require('fs');
      fs.writeFileSync('newsletter-files-response.json', JSON.stringify(jsonData, null, 2));
      console.log('\n💾 Full response saved to newsletter-files-response.json');
      
    } catch (e) {
      console.log('Raw response:', data);
      console.error('\nError parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Request error:', e.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure the development server is running (npm run dev:https)');
  console.log('2. Check that you can access https://172.22.58.184:8443 in your browser');
  console.log('3. Ensure your AUTH_COOKIE is valid and not expired');
});

req.end();

console.log('Waiting for response...');