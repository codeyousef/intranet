# Newsletter Fix Documentation

## Issue Description

The newsletter components (both homepage and archive) were experiencing issues. The error messages displayed were:

1. "Error fetching newsletter" with console logs showing:
   ```
   [NEWSLETTER-ERROR] API returned success:false or missing newsletter data
   [NEWSLETTER-ERROR] Newsletter fetch failed: fetch failed
   ```

2. Later, a more specific error was identified:
   ```
   [NEWSLETTER-ERROR] Newsletter fetch failed: Newsletter file not found in any of the expected locations
   ```

3. React error #418 related to HTML rendering:
   ```
   Uncaught Error: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message
   ```

4. Newsletter archive was failing with a 503 error:
   ```
   Failed to load resource: the server responded with a status of 503 (Service Unavailable)
   Error fetching file: 503 Service Unavailable {"success":false,"message":"Failed to access SharePoint site"}
   ```

## Root Cause

After investigation, multiple issues were identified:

1. **Authentication Issue**: The original implementation was trying to access the newsletter content through SharePoint lists using app-only authentication (client credentials flow), but the app didn't have sufficient permissions.

2. **File Location Issue**: The newsletter file couldn't be found in any of the expected locations for some users.

3. **HTML Rendering Issue**: The newsletter HTML content contained malformed or problematic HTML that caused React rendering errors.

4. **Inconsistent SharePoint Configuration**: The newsletter archive component was using a different SharePoint site URL ("nasairgroup.sharepoint.com/sites/Flyadeal") than the main newsletter component ("flyadeal.sharepoint.com/sites/Thelounge"), causing authentication failures.

## Solution

The fix involved a comprehensive approach:

1. **Changed Access Method**: Instead of accessing the newsletter through SharePoint lists, we now fetch it directly as a file from the SharePoint document library using the `getFileContent` function.

2. **Expanded Search Paths**: We added more possible paths to find the newsletter file, making the solution more robust.

3. **Improved HTML Processing**: We added more robust HTML sanitization and error handling to prevent React rendering errors.

4. **Enhanced Error Handling**: We implemented user-friendly fallback content for various error scenarios instead of showing error messages.

5. **Standardized SharePoint Access**: We updated the newsletter archive component to use the same SharePoint access method and configuration as the main newsletter component.

6. **Added Testing Tools**: We created test endpoints and scripts to verify the fix works in different scenarios.

## Changes Made

1. Modified `src/app/api/sharepoint/newsletter-list/route.ts`:
   - Removed the custom `getGraphToken` function
   - Imported the `getFileContent` function from `@/lib/sharepointClient`
   - Added more possible paths to find the newsletter file
   - Added robust HTML processing with error handling
   - Improved error handling with user-friendly fallback content
   - Added support for test parameters to simulate different error scenarios

2. Modified `src/app/api/sharepoint/newsletter-archive/route.ts`:
   - Replaced custom SharePoint access code with the `getFileContent` function
   - Updated the SharePoint site configuration to match the main newsletter component
   - Added caching similar to the main newsletter component
   - Added HTML processing to prevent React rendering errors
   - Implemented robust error handling with user-friendly fallback content
   - Added detailed logging with request IDs

3. Added test endpoints and scripts:
   - Created `src/app/api/test-newsletter-fix/route.ts` for basic testing
   - Created `src/app/api/test-newsletter-fix-v2/route.ts` for advanced testing with different scenarios
   - Added `test-newsletter-fix.sh` (Bash) and `test-newsletter-fix.ps1` (PowerShell) scripts for basic testing
   - Added `test-newsletter-fix-v2.ps1` (PowerShell) script for advanced testing

## Testing the Fix

You can test the fix using one of the following methods:

### Method 1: Using the Web Browser

1. Sign in to the application
2. Navigate to `/api/test-newsletter-fix-v2` for basic testing
3. For testing specific scenarios, use query parameters:
   - `/api/test-newsletter-fix-v2?test=not-found` - Tests file not found handling
   - `/api/test-newsletter-fix-v2?test=permission-error` - Tests permission error handling
   - `/api/test-newsletter-fix-v2?test=network-error` - Tests network error handling
   - `/api/test-newsletter-fix-v2?test=html-error` - Tests HTML error handling

### Method 2: Using PowerShell (Windows)

For basic testing:
```powershell
# From the project root
.\test-newsletter-fix.ps1
```

For advanced testing with different scenarios:
```powershell
# From the project root
.\test-newsletter-fix-v2.ps1
```

### Method 3: Using Bash (Linux/Mac)

```bash
# From the project root
bash ./test-newsletter-fix.sh
```

## Expected Results

After the fix, the newsletter should:

1. Load correctly for all authenticated users
2. Display the content from the SharePoint document library when available
3. Show user-friendly fallback content (not error messages) when issues occur
4. Handle malformed HTML without causing React rendering errors

## Troubleshooting

If the newsletter still doesn't load correctly:

1. Check the browser console for error messages
2. Run the test scripts to identify specific issues
3. Verify that the SharePoint document library contains a newsletter file in one of the expected paths
4. Ensure the app has the necessary permissions to access files in the SharePoint document library
5. Check the server logs for more detailed error information
6. Try clearing the browser cache and localStorage

## Additional Notes

The fix is designed to be resilient to various failure modes:

1. If the newsletter file can't be found, it shows a "Newsletter Coming Soon" message
2. If there are permission issues, it provides guidance on contacting IT support
3. If there are network issues, it suggests checking connectivity
4. If there are HTML processing issues, it provides a simplified version of the content

This approach ensures users always see something useful rather than error messages.
