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
 * This implementation includes retry logic and timeout settings to handle connection issues
 * @param callback Function to execute with the FTP client
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Result of the callback function
 */
async function withFtpClient<T>(
  callback: (client: ftp.Client) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  // Create a new client for this connection
  const client = new ftp.Client(10000); // 10 second timeout for control socket

  // Configure client with more robust settings
  client.ftp.verbose = process.env.NODE_ENV === 'development'; // Enable verbose logging in development

  let lastError: any = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`FTP connection attempt ${retryCount} of ${maxRetries}...`);
        // Add exponential backoff delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }

      // Configure client with more robust settings
      client.ftp.socket.setKeepAlive(true, 1000); // Enable keep-alive to prevent idle disconnects

      // Connect to the server with timeout settings
      await client.access({
        host: FTP_CONFIG.host,
        user: FTP_CONFIG.user,
        password: FTP_CONFIG.password,
        secure: FTP_CONFIG.secure,
        port: FTP_CONFIG.port,
      });

      // Change to the base directory
      await client.cd(BASE_DIRECTORY);

      // Execute the callback function
      const result = await callback(client);

      // Close the connection before returning
      await client.close();

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if this is a connection error that warrants a retry
      const isRetryableError = 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        (error.message && (
          error.message.includes('ECONNRESET') ||
          error.message.includes('timeout') ||
          error.message.includes('timed out')
        ));

      // Close the connection on error
      try {
        await client.close();
      } catch (closeError) {
        // Ignore errors during a close on error path
      }

      // If we've reached max retries, or it's not a retryable error, throw the error
      if (retryCount >= maxRetries || !isRetryableError) {
        console.error('FTP operation failed after', retryCount > 0 ? `${retryCount} retries:` : 'initial attempt:', error.message);
        // Add retry information to the error object
        error.retryAttempts = retryCount;
        throw error;
      }

      console.warn(`FTP connection error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      retryCount++;
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
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

    const { Writable } = require('stream');
    const writer = new Writable({
      write(chunk: any, encoding: any, callback: any) {
        chunks.push(Buffer.from(chunk));
        totalLength += chunk.length;
        callback();
      }
    });

    // Download the file
    await client.downloadTo(writer, filePath);

    // Combine chunks and convert to string
    const buffer = Buffer.concat(chunks, totalLength);
    return buffer.toString('utf-8');
  });
}

/**
 * Test connection to the FTP server
 * Enhanced implementation that tries to connect with retry logic and provides detailed error information
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Object with connection status and detailed error information if any
 */
export async function testConnection(maxRetries: number = 3): Promise<{ 
  connected: boolean; 
  error?: string; 
  details?: any; 
  troubleshooting?: string[];
  retryAttempts?: number;
}> {
  let retryAttempts = 0;

  try {
    // Connection test with retry logic
    await withFtpClient(
      async (client) => {
        // List files to verify the connection works
        await client.list();
        return true;
      },
      maxRetries
    );

    // If we get here, the connection was successful
    return { connected: true };
  } catch (error: any) {
    // Connection failed - capture detailed error information
    const errorMessage = error.message || 'Unknown error';
    console.error('FTP connection failed after retries:', errorMessage);

    // Format timestamp in a more user-friendly way - matching the format in the issue description
    const now = new Date();
    // Format: MM/DD/YYYY, H:MM:SS AM/PM
    const formattedTimestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}, ${now.toLocaleTimeString()}`;

    // Extract retry information if available
    if (error.retryAttempts !== undefined) {
      retryAttempts = error.retryAttempts;
    }

    // Create a detailed error details object - matching the format in the issue description
    const errorDetails: Record<string, any> = {
      // Error details section
      'Error Code': error.code,
      'Message': error.message,
      'System Call': error.syscall,
      'Error Number': error.errno,
      'Type': error.name || 'Error',

      // Connection Information section
      'Connection Information': {
        'Host': FTP_CONFIG.host,
        'Port': FTP_CONFIG.port,
        'Secure': FTP_CONFIG.secure ? 'Yes' : 'No',
        'Base Directory': BASE_DIRECTORY,
        'Timestamp': formattedTimestamp
      }
    };

    // Basic troubleshooting tips
    const troubleshootingTips = [
      'Check your network connection',
      'Verify FTP server is online',
      'Ensure firewall is not blocking FTP traffic',
      'Try again in a few minutes'
    ];

    // Add specific tips for different error types - exactly matching the issue description
    if (error.code === 'ECONNRESET' || (errorMessage && errorMessage.includes('ECONNRESET'))) {
      errorDetails.friendlyMessage = 'The connection was reset by the server or a network device in between.';
      troubleshootingTips.push(
        'This is often caused by firewall settings or network issues',
        'Check if your network has a timeout policy for idle connections',
        'Try using a VPN or different network connection',
        'Contact your network administrator to allow FTP traffic on port 21',
        'Verify the FTP server is configured to accept connections from your IP address',
        'Try connecting at a different time as the server might be overloaded',
        'Consider increasing the connection timeout settings'
      );
    } else if (error.code === 'ETIMEDOUT' || (errorMessage && errorMessage.includes('timeout'))) {
      errorDetails.friendlyMessage = 'The connection timed out while trying to connect to the FTP server.';
      troubleshootingTips.push(
        'The server might be temporarily unavailable or overloaded',
        'Check your network connection speed and stability',
        'Try increasing the connection timeout settings'
      );
    } else if (error.code === 'ECONNREFUSED') {
      errorDetails.friendlyMessage = 'The connection was refused by the FTP server.';
      troubleshootingTips.push(
        'Verify the FTP server is running and accepting connections',
        'Check if the server is blocking connections from your IP address',
        'Verify the port number is correct'
      );
    } else if (error.code === 'ENOTFOUND') {
      errorDetails.friendlyMessage = 'The FTP server hostname could not be resolved.';
      troubleshootingTips.push(
        'Check if the hostname is correct',
        'Verify your DNS settings',
        'Try using an IP address instead of a hostname if possible'
      );
    }

    // Format the response to match the issue description format
    return { 
      connected: false, 
      error: `Could not connect to FTP server: ${errorMessage} (Error code: ${error.code})`,
      details: errorDetails,
      troubleshooting: troubleshootingTips,
      retryAttempts: retryAttempts
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
