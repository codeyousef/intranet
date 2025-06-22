// app/api/viva-engage/test-logging/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper function for terminal logging (same as in the main viva-engage route)
function terminalLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[VIVA-ENGAGE-TEST][${timestamp}][${level}]`;
  
  // Create a formatted message
  let formattedMessage = `${prefix} ${message}`;
  
  // Add data if provided
  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        formattedMessage += `\n[Object cannot be stringified]`;
      }
    } else {
      formattedMessage += ` ${data}`;
    }
  }
  
  // Use process.stdout.write for direct terminal output
  if (level === 'INFO') {
    process.stdout.write(`${formattedMessage}\n`);
    console.log(formattedMessage);
  } else if (level === 'WARN') {
    process.stdout.write(`\x1b[33m${formattedMessage}\x1b[0m\n`);
    console.warn(formattedMessage);
  } else if (level === 'ERROR') {
    process.stdout.write(`\x1b[31m${formattedMessage}\x1b[0m\n`);
    console.error(formattedMessage);
  }
  
  // Force flush stdout
  if (process.stdout.write('')) {
    process.stdout.write('');
  }
}

/**
 * This API route is used to test the terminal logging functionality.
 * It outputs various log messages to the terminal to verify that logging is working.
 */
export async function GET(request: NextRequest) {
  terminalLog('INFO', '====== VIVA ENGAGE LOGGING TEST STARTED ======');
  terminalLog('INFO', 'This is a test of the terminal logging functionality');
  
  // Log some test messages
  terminalLog('INFO', 'Test info message');
  terminalLog('WARN', 'Test warning message');
  terminalLog('ERROR', 'Test error message');
  
  // Log with data
  terminalLog('INFO', 'Test info with data', { key: 'value', number: 123 });
  terminalLog('WARN', 'Test warning with data', ['item1', 'item2', 'item3']);
  terminalLog('ERROR', 'Test error with data', new Error('Test error object').stack);
  
  // Log a simulated fetch operation
  terminalLog('INFO', 'Simulating fetch operation...');
  const fetchStartTime = new Date();
  
  // Wait for 1 second to simulate a network request
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const fetchEndTime = new Date();
  const fetchDuration = fetchEndTime.getTime() - fetchStartTime.getTime();
  
  terminalLog('INFO', '====== SIMULATED RESPONSE RECEIVED ======');
  terminalLog('INFO', `Fetch completed in ${fetchDuration}ms`);
  
  terminalLog('INFO', '====== VIVA ENGAGE LOGGING TEST COMPLETED ======');
  
  // Return a simple response
  return NextResponse.json({
    success: true,
    message: 'Logging test completed. Check your terminal for log messages.',
    timestamp: new Date().toISOString(),
    testId: Math.random().toString(36).substring(2, 10)
  });
}