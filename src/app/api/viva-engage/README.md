# Viva Engage API Logging

This document explains the enhanced logging features added to the Viva Engage API route to help diagnose loading issues.

## Overview

The Viva Engage component was not loading properly, and there was no useful logging in the terminal to help diagnose the issue. To address this, we've implemented enhanced terminal logging that:

1. Makes logs more visible in the terminal with clear formatting
2. Uses direct terminal output with `process.stdout.write`
3. Adds color coding for different log levels
4. Includes timing information for key operations
5. Provides clear section markers for important events

## How to Use

### Viewing Logs

When the Viva Engage component is loaded, detailed logs will now appear in the terminal where you're running the Next.js development server. Look for log entries with the prefix `[VIVA-ENGAGE]`.

Important sections are marked with `====== SECTION NAME ======` to make them stand out in the logs.

### Testing the Logging

A test endpoint has been created to verify that the logging is working correctly:

1. Start your Next.js development server
2. Visit `/api/viva-engage/test-logging` in your browser
3. Check your terminal for test log messages

You should see various log messages with different levels (INFO, WARN, ERROR) and formatting.

### Log Format

Logs follow this format:
```
[VIVA-ENGAGE][timestamp][LEVEL] Message data
```

For example:
```
[VIVA-ENGAGE][2023-06-15T12:34:56.789Z][INFO] Fetching Viva Engage content from https://web.yammer.com/embed/groups
```

### Log Levels

- **INFO** - Standard information messages (normal color)
- **WARN** - Warning messages (yellow color)
- **ERROR** - Error messages (red color)

## Troubleshooting

If you're still not seeing logs in the terminal:

1. Make sure you're looking at the correct terminal window where the Next.js server is running
2. Try restarting the Next.js development server
3. Check if there are any errors in the browser console that might be preventing the Viva Engage component from loading
4. Try accessing the test endpoint at `/api/viva-engage/test-logging` to verify logging is working

## Key Log Points to Look For

When diagnosing Viva Engage loading issues, pay attention to these key log points:

1. `====== VIVA ENGAGE API ROUTE CALLED ======` - Confirms the API route was called
2. Auth session retrieval - Check if a valid session exists
3. `====== VIVA ENGAGE RESPONSE RECEIVED ======` - Confirms a response was received from Yammer
4. Response status and timing - Check for slow responses or error status codes
5. HTML content length and sample - Check if valid content was received
6. Any ERROR level logs - These indicate critical issues

## Implementation Details

The enhanced logging is implemented in:

- `src/app/api/viva-engage/route.ts` - Main API route with enhanced logging
- `src/app/api/viva-engage/test-logging/route.ts` - Test endpoint for verifying logging

The core of the implementation is the `terminalLog` function that handles formatting and output of log messages.