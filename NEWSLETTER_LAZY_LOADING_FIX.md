# Newsletter Lazy Loading Fix

## Issue Description

The newsletter component was experiencing issues with loading and rendering. The error message displayed was "Loading newsletter" and the console showed:

```
[Intervention] Images loaded lazily and replaced with placeholders. Load events are deferred. See https://go.microsoft.com/fwlink/?linkid=2048113
```

Additionally, there was a React error #418 related to HTML rendering:

```
Uncaught Error: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

## Root Cause

After investigation, the root cause was identified as:

1. **Lazy Loading of Images**: The browser was lazy-loading images in the newsletter content, which was causing issues with React rendering. When images are lazy-loaded, they are initially replaced with placeholders, and the load events are deferred. This can cause problems with React's rendering process, especially when the content is rendered in an iframe or with dangerouslySetInnerHTML.

2. **Sanitization Stripping Attributes**: The HTML sanitization process was stripping out the `loading="eager"` and `decoding="sync"` attributes from images and the `loading="eager"` attribute from iframes. These attributes are necessary to prevent lazy loading and ensure proper rendering.

## Solution

The solution involved two main changes:

1. **Update HTML Sanitization**: Modified the `sanitize.ts` file to allow the `loading`, `decoding`, `sandbox`, and `referrerpolicy` attributes to be preserved during sanitization.

2. **Ensure Server-Side Processing**: Verified that the newsletter-list API route was already adding the necessary attributes to images and iframes, but they were being stripped out during sanitization.

## Changes Made

1. Modified `src/lib/sanitize.ts`:
   - Added 'loading', 'decoding', 'sandbox', and 'referrerpolicy' to the ALLOWED_ATTR array
   - This ensures that these attributes are preserved during the sanitization process

2. Verified that `src/app/api/sharepoint/newsletter-list/route.ts` already had the necessary code:
   - It adds `loading="eager" decoding="sync"` to images
   - It adds `sandbox="allow-same-origin allow-scripts" loading="eager"` to iframes

## Expected Results

After these changes, the newsletter should:

1. Load correctly without getting stuck at "Loading newsletter"
2. Not show the lazy loading intervention message in the console
3. Not encounter the React error #418 related to HTML rendering

## Testing

To test these changes:

1. Clear your browser's cache and localStorage
2. Visit the homepage and verify that the newsletter loads correctly
3. Check the browser console to ensure there are no lazy loading intervention messages or React errors

## Additional Notes

This fix addresses a common issue with React and lazy-loaded content. By explicitly setting `loading="eager"` on images and iframes, we're telling the browser to load these resources immediately, which helps prevent rendering issues with React.

The React error #418 is often related to HTML content that React cannot properly render. By ensuring that all HTML content is properly sanitized and that images and iframes are loaded eagerly, we can prevent this error.