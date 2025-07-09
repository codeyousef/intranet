import { verifyFileAccess, listFiles } from './src/lib/sharepointClient';

/**
 * Test script to verify SharePoint access and read the Exp1004.csv file
 * 
 * This script:
 * 1. Lists files in the root of the SharePoint document library
 * 2. Verifies access to the specific Exp1004.csv file
 * 3. Displays the file content if accessible
 */

async function testSharePointAccess() {
  console.log('Testing SharePoint access...');
  console.log('----------------------------');
  
  try {
    // Step 1: List files in the root folder
    console.log('Step 1: Listing files in the root folder...');
    const files = await listFiles();
    console.log(`Found ${files.length} files/folders in the root:`);
    
    // Display file names and types
    files.forEach((file: any, index: number) => {
      console.log(`${index + 1}. ${file.name} (${file.folder ? 'Folder' : 'File'})`);
    });
    
    console.log('\n----------------------------\n');
    
    // Step 2: Verify access to the specific file
    const targetFile = 'Exp1004.csv';
    console.log(`Step 2: Verifying access to "${targetFile}"...`);
    
    const fileAccess = await verifyFileAccess(targetFile);
    
    if (fileAccess.accessible) {
      console.log(`✅ Successfully accessed "${targetFile}"`);
      console.log(`File size: ${fileAccess.fileDetails?.contentLength} bytes`);
      console.log('\nPreview of file content:');
      console.log('----------------------------');
      console.log(fileAccess.fileDetails?.previewContent);
      console.log('----------------------------');
    } else {
      console.error(`❌ Could not access "${targetFile}"`);
      console.error(`Error: ${fileAccess.error}`);
    }
  } catch (error: any) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
  }
}

// Run the test
testSharePointAccess()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed with unhandled error:');
    console.error(error);
    process.exit(1);
  });