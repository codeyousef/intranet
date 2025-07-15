import { NextRequest, NextResponse } from 'next/server';
import { listFiles, getFileContent, testConnection, getDirectoryStructure } from '@/lib/ftpClient';

/**
 * API route for FTP operations
 * This is a read-only implementation - no writing to the server is allowed
 */

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const directory = searchParams.get('directory') || '';
    const filePath = searchParams.get('filePath') || '';

    // Handle different actions
    switch (action) {
      case 'list':
        // List files in a directory
        const files = await listFiles(directory);
        return NextResponse.json({ success: true, files });

      case 'content':
        // Get file content
        if (!filePath) {
          return NextResponse.json(
            { success: false, error: 'File path is required' },
            { status: 400 }
          );
        }
        const content = await getFileContent(filePath);
        return NextResponse.json({ success: true, content });

      case 'test':
        // Test connection
        const connectionResult = await testConnection();
        return NextResponse.json({ 
          success: true, 
          connected: connectionResult.connected,
          error: connectionResult.error,
          details: connectionResult.details,
          troubleshooting: connectionResult.troubleshooting,
          retryAttempts: connectionResult.retryAttempts
        });

      case 'structure':
        // Get directory structure
        const structure = await getDirectoryStructure(directory);
        return NextResponse.json({ success: true, structure });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('FTP API error:', error);

    // Create a comprehensive error details object
    const errorDetails: Record<string, any> = {};

    // Add standard error properties
    if (error.code) errorDetails.code = error.code;
    if (error.name) errorDetails.name = error.name;
    if (error.message) errorDetails.message = error.message;
    if (process.env.NODE_ENV === 'development' && error.stack) errorDetails.stack = error.stack;
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
      timestamp: new Date().toISOString(),
      action: request.nextUrl.searchParams.get('action'),
      directory: request.nextUrl.searchParams.get('directory') || '',
      filePath: request.nextUrl.searchParams.get('filePath') || ''
    };

    // Default troubleshooting tips
    let troubleshootingTips = [
      'This appears to be an unexpected error',
      'Try refreshing the page and attempting the operation again',
      'Check the server logs for more detailed information'
    ];

    // Add specific tips for ECONNRESET errors
    if (error.code === 'ECONNRESET' || (error.message && error.message.includes('ECONNRESET'))) {
      errorDetails.friendlyMessage = 'The connection was reset by the server or a network device in between.';
      troubleshootingTips = [
        'This is often caused by firewall settings or network issues',
        'Check if your network has a timeout policy for idle connections',
        'Try using a VPN or different network connection',
        'Contact your network administrator to allow FTP traffic on port 21',
        'Verify the FTP server is configured to accept connections from your IP address',
        'Try connecting at a different time as the server might be overloaded'
      ];
    }

    // Log the full error object and details for debugging
    console.error('Detailed FTP API error:', errorDetails);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    console.error('Error syscall:', error.syscall);
    console.error('Error errno:', error.errno);

    // Log the serialized error details
    console.error('Serialized error details (API route):', JSON.stringify(errorDetails, null, 2));

    // Log each property of the error details object
    console.log('Error details properties (API route):');
    for (const key in errorDetails) {
      try {
        console.log(`- ${key}:`, typeof errorDetails[key] === 'object' ? JSON.stringify(errorDetails[key]) : errorDetails[key]);
      } catch (e) {
        console.log(`- ${key}: [Error displaying value]`);
      }
    }

    // Log the troubleshooting tips
    console.error('Troubleshooting tips:', troubleshootingTips);

    const errorResponse = {
      success: false,
      error: error.message || 'An error occurred',
      details: errorDetails,
      troubleshooting: troubleshootingTips
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// No POST, PUT, DELETE methods - this is a read-only implementation
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed - this is a read-only API' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed - this is a read-only API' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed - this is a read-only API' },
    { status: 405 }
  );
}
