# Newsletter Fix V2 Documentation

## Issue Description

Users were experiencing issues with the newsletter not loading on the homepage:
1. For some users, it was loading from localStorage without attempting to fetch it
2. For other users, it was still showing the fallback content

## Root Cause Analysis

After investigating the code, several issues were identified:

1. **localStorage Flag Issue**: The component was setting the `newsletterLoaded` flag in localStorage even when there was an error. This caused it to try to load from localStorage on subsequent visits but not find the data.

2. **Error Handling**: When errors occurred, the component was showing fallback content but still setting the `newsletterLoaded` flag, preventing it from trying to fetch again on subsequent visits.

3. **Force Fetch Mechanism**: The force fetch mechanism was relying solely on a URL parameter and required a page reload, which wasn't ideal for user experience.

4. **No Periodic Refresh**: There was no mechanism to periodically refresh the newsletter content, so users who left the page open for a long time would see stale content.

## Changes Made

### 1. Fixed localStorage Handling

- Modified the error handling to not set the `newsletterLoaded` flag when there's an error
- This ensures that the component will try to fetch the newsletter again on subsequent visits if there was an error

```javascript
// Before
localStorage.setItem('newsletterLoaded', 'true');
globalNewsletterLoaded.current = true;

// After
console.log('[NEWSLETTER] Not setting loaded flag due to network error');
```

### 2. Improved Missing Data Handling

- Enhanced the logic for handling cases where the flag is set but the data isn't in localStorage
- Added a temporary loading state message to provide better feedback to the user
- Added a slight delay before triggering the fetch to ensure the UI updates first

```javascript
// Before
console.log('[NEWSLETTER] No data found in localStorage despite loaded flag being set - clearing flag');
localStorage.removeItem('newsletterLoaded');
globalNewsletterLoaded.current = false;
fetchNewsletter();

// After
console.log('[NEWSLETTER] No data found in localStorage despite loaded flag being set - clearing flag');
localStorage.removeItem('newsletterLoaded');
globalNewsletterLoaded.current = false;

// Set a temporary loading state message
setNewsletter({
  title: "Loading Newsletter",
  content: "<div style='text-align: center; padding: 20px;'><p>Retrieving the latest newsletter...</p></div>",
  lastUpdated: new Date().toISOString(),
  source: "system"
});

// Trigger a fetch with a slight delay to ensure UI updates first
setTimeout(() => {
  fetchNewsletter();
}, 100);
```

### 3. Enhanced Force Fetch Mechanism

- Added more conditions for when to force a fetch:
  - URL parameter `force_fetch=true` (existing)
  - A timestamp parameter `fetch_ts` that's newer than our last fetch
  - Auto-refresh if it's been more than 30 minutes since the last fetch
- Improved the user experience during a force fetch:
  - If we already have newsletter content, we keep showing it while fetching fresh data
  - If we don't have content yet, we show a loading state

### 4. Updated Reset Function

- Completely rewrote the `resetNewsletterLoadingState` function:
  - Instead of reloading the page, it now updates the UI and fetches in the background
  - Clears localStorage and resets state variables
  - Sets a loading state to provide immediate feedback to the user
  - Updates the URL with a timestamp parameter without reloading the page
  - Directly fetches the newsletter with force_fetch and clear_cache parameters

### 5. Added Periodic Refresh

- Added a mechanism to periodically refresh the newsletter content:
  - Checks every 5 minutes if it's been at least 30 minutes since the last fetch
  - If it's time for a refresh, it fetches the latest content
  - Updates the UI and localStorage if the fetch is successful
  - Silently fails if there's an error (no UI update or error message)

```javascript
// Set up a periodic refresh timer (every 30 minutes)
const refreshInterval = 30 * 60 * 1000; // 30 minutes
const periodicRefreshTimer = setInterval(() => {
  const currentTime = Date.now();
  const timeSinceLastFetch = currentTime - lastFetchAttemptRef.current;
  
  // Only refresh if it's been at least 30 minutes since the last fetch
  if (timeSinceLastFetch >= refreshInterval) {
    console.log('[NEWSLETTER] Periodic refresh triggered - fetching latest newsletter');
    
    // Fetch the newsletter without clearing localStorage
    fetch('/api/sharepoint/newsletter-list?force_fetch=true', {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.newsletter) {
        console.log('[NEWSLETTER] Periodic refresh successful - updating content');
        setNewsletter(data.newsletter);
        localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
        localStorage.setItem('newsletterLoaded', 'true');
        globalNewsletterLoaded.current = true;
        lastFetchAttemptRef.current = currentTime;
      }
    })
    .catch(error => {
      console.error('[NEWSLETTER] Periodic refresh failed:', error.message);
      // Don't update the UI or show an error message for background refreshes
    });
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

## Expected Results

After these changes, the newsletter should:

1. Always attempt to fetch when there was an error on the previous visit
2. Provide better feedback to the user when loading or when there's an error
3. Automatically refresh the content periodically to ensure it's up to date
4. Allow for manual refresh without reloading the page

## Testing

To test these changes:

1. Clear your browser's localStorage and cache
2. Visit the homepage and verify that the newsletter loads correctly
3. Refresh the page and verify that it loads from localStorage
4. Click the "Retry" button if there's an error and verify that it fetches again
5. Leave the page open for more than 30 minutes and verify that it automatically refreshes

## Troubleshooting

If users are still experiencing issues:

1. Check the browser console for error messages
2. Verify that localStorage is working correctly
3. Try clearing localStorage and cache
4. Check the network tab to see if the fetch requests are being made
5. Verify that the API is returning the expected data