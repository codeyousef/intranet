import * as ftp from 'basic-ftp';

/**
 * FTP Client for reading files from the FTP server
 * This implementation is read-only and does not support writing to the server
 */

// FTP server configuration - exactly matching Python implementation
const FTP_CONFIG = {
  host: 'ftp.hostedftp.com',
  user: 'IOCC1',
  password: 'flyadeal@123',
  secure: false, // Set to true if using FTPS
  port: 21, // Default FTP port
};

// Base directory path - exactly matching Python implementation
const BASE_DIRECTORY = 'Operations/SITA/COM_IN';

/**
 * Connect to the FTP server and execute a callback function
 * This implementation is extremely simplified to match the Python implementation
 * which successfully connects to the FTP server
 * @param callback Function to execute with the FTP client
 * @returns Result of the callback function
 */
async function withFtpClient<T>(callback: (client: ftp.Client) => Promise<T>): Promise<T> {
  // Create a new client for this connection - simple like Python's FTP()
  const client = new ftp.Client();
  console.log('FTP client created');

  try {
    console.log('Connecting to FTP server:', FTP_CONFIG.host);

    // Connect to the server - simple approach exactly like Python's implementation
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure,
      port: FTP_CONFIG.port
    });
    console.log('Connected to FTP server successfully');

    // Change to the base directory - like Python's ftp.cwd()
    console.log('Changing to directory:', BASE_DIRECTORY);
    await client.cd(BASE_DIRECTORY);
    console.log('Changed to directory successfully');

    // Execute the callback function
    console.log('Executing callback function');
    const result = await callback(client);
    console.log('Callback function executed successfully');

    return result;
  } catch (error: any) {
    console.error('Error in FTP operation:', error.message);
    throw error;
  } finally {
    // Always close the connection in a finally block, exactly like Python's implementation
    // This ensures it runs regardless of success or failure
    try {
      console.log('Closing FTP connection in finally block');
      await client.close();
      console.log('FTP connection closed successfully');
    } catch (closeError) {
      console.warn('Error closing FTP connection:', closeError);
    }
  }
}

/**
 * List files in a directory
 * @param directory Directory path relative to the base directory (optional)
 * @returns List of file information
 */
export async function listFiles(directory: string = ''): Promise<ftp.FileInfo[]> {
  return withFtpClient(async (client) => {
    if (directory) {
      await client.cd(directory);
    }
    return await client.list();
  });
}

/**
 * Get file content as text
 * @param filePath Path to the file relative to the base directory
 * @returns File content as text
 */
export async function getFileContent(filePath: string): Promise<string> {
  return withFtpClient(async (client) => {
    // Create a writable stream to store the file content
    const chunks: Buffer[] = [];
    let totalLength = 0;

    const writer = new ftp.DownloadStreamOptions();
    writer.streamConsumer = (source) => {
      return new Promise((resolve, reject) => {
        source.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
          totalLength += chunk.length;
        });
        source.on('end', resolve);
        source.on('error', reject);
      });
    };

    // Download the file
    await client.downloadFrom(writer, filePath);

    // Combine chunks and convert to string
    const buffer = Buffer.concat(chunks, totalLength);
    return buffer.toString('utf-8');
  });
}

/**
 * Test connection to the FTP server
 * Simple implementation that just tries to connect and list files
 * @returns Object with connection status and basic error information if any
 */
export async function testConnection(): Promise<{ connected: boolean; error?: string; details?: any; troubleshooting?: string[] }> {
  console.log('Starting FTP connection test');

  try {
    // Simple connection test - just try to connect and list files
    await withFtpClient(async (client) => {
      console.log('FTP connection established, testing directory listing');

      // List files to verify the connection works
      const files = await client.list();
      console.log(`Successfully listed ${files.length} files/directories`);

      // Log the first few files for debugging
      if (files.length > 0) {
        console.log('First few files/directories:');
        files.slice(0, 5).forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.type === 2 ? 'Directory' : 'File'})`);
        });
      }

      return true;
    });

    // If we get here, the connection was successful
    console.log('FTP connection test successful');
    return { connected: true };
  } catch (error: any) {
    // Connection failed - capture detailed error information
    const errorMessage = error.message || 'Unknown error';
    console.error('FTP connection test failed:', errorMessage);

    // Log detailed error information
    console.error('Error details:');
    console.error('- Code:', error.code);
    console.error('- Name:', error.name);
    console.error('- Syscall:', error.syscall);
    console.error('- Errno:', error.errno);

    // Create a comprehensive error details object
    const errorDetails: Record<string, any> = {};

    // Add standard error properties
    if (error.code) errorDetails.code = error.code;
    if (error.name) errorDetails.name = error.name;
    if (error.message) errorDetails.message = error.message;
    if (error.syscall) errorDetails.syscall = error.syscall;
    if (error.errno) errorDetails.errno = error.errno;

    // Add FTP-specific properties
    if (error.info) errorDetails.info = error.info;

    // Add all enumerable properties from the error object
    for (const key in error) {
      if (Object.prototype.hasOwnProperty.call(error, key) && !errorDetails[key]) {
        try {
          // Try to serialize the property
          const serialized = JSON.stringify(error[key]);
          if (serialized) {
            errorDetails[key] = error[key];
          }
        } catch (e) {
          // If the property can't be serialized, convert it to a string
          try {
            errorDetails[key] = String(error[key]);
          } catch (e2) {
            // If even String() fails, just note that it's not serializable
            errorDetails[key] = '[Not serializable]';
          }
        }
      }
    }

    // Add connection information that might help with troubleshooting
    errorDetails.connectionInfo = {
      host: FTP_CONFIG.host,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure,
      baseDirectory: BASE_DIRECTORY,
      timestamp: new Date().toISOString()
    };

    // Basic troubleshooting tips
    const troubleshootingTips = [
      'Check your network connection',
      'Verify FTP server is online',
      'Ensure firewall is not blocking FTP traffic',
      'Try again in a few minutes'
    ];

    // Add specific tips for ECONNRESET errors
    if (error.code === 'ECONNRESET' || (errorMessage && errorMessage.includes('ECONNRESET'))) {
      errorDetails.friendlyMessage = 'The connection was reset by the server or a network device in between.';
      troubleshootingTips.push(
        'This is often caused by firewall settings or network issues',
        'Check if your network has a timeout policy for idle connections',
        'Try using a VPN or different network connection',
        'Contact your network administrator to allow FTP traffic on port 21',
        'Verify the FTP server is configured to accept connections from your IP address',
        'Try connecting at a different time as the server might be overloaded'
      );
    }

    // Log the full error object and details for debugging
    console.error('FTP connection error details:', error);
    console.error('Serialized error details:', errorDetails);
    console.error('Troubleshooting tips:', troubleshootingTips);

    return { 
      connected: false, 
      error: errorMessage,
      details: errorDetails,
      troubleshooting: troubleshootingTips
    };
  }
}

/**
 * Get directory structure
 * @param directory Directory path relative to the base directory (optional)
 * @returns Hierarchical structure of directories and files
 */
export async function getDirectoryStructure(directory: string = ''): Promise<any> {
  return withFtpClient(async (client) => {
    if (directory) {
      await client.cd(directory);
    }

    const files = await client.list();
    const structure: any = {};

    for (const file of files) {
      if (file.type === ftp.FileType.Directory) {
        // For directories, recursively get their structure
        const subDirectory = directory ? `${directory}/${file.name}` : file.name;
        structure[file.name] = await getDirectoryStructure(subDirectory);
      } else {
        // For files, just store their size and date
        structure[file.name] = {
          size: file.size,
          date: file.date
        };
      }
    }

    return structure;
  });
}
