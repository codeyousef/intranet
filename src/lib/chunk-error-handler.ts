/**
 * Client-side error handler for chunk loading errors
 * This script adds global error handlers to catch and handle chunk loading errors
 * that might occur outside of React's component tree.
 * 
 * It includes automatic retry logic for failed chunk loads to improve recovery
 * without requiring a full page refresh.
 */

// Only run in browser environment
if (typeof window !== 'undefined') {
  // Track failed chunks to avoid infinite retry loops
  const failedChunks = new Map<string, number>();
  const MAX_RETRIES = 3;
  let isRetrying = false;

  /**
   * Extract chunk ID from error
   * This helps identify which chunk failed to load
   */
  const getChunkIdFromError = (error: any): string | null => {
    if (!error) return null;

    // Try to extract chunk ID from error message or stack
    const errorText = error.message || error.stack || '';
    const chunkMatch = errorText.match(/Loading chunk (\d+) failed/i);

    if (chunkMatch && chunkMatch[1]) {
      return chunkMatch[1];
    }

    // If we can't extract a specific chunk ID, use a timestamp as a unique identifier
    return 'unknown-' + Date.now();
  };

  /**
   * Retry loading failed chunks
   * This function attempts to reload the JavaScript files that failed to load
   */
  const retryLoadChunk = (chunkId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Get retry count for this chunk
      const retryCount = failedChunks.get(chunkId) || 0;

      // If we've exceeded max retries, don't try again
      if (retryCount >= MAX_RETRIES) {
        console.warn(`[ChunkErrorHandler] Maximum retries (${MAX_RETRIES}) reached for chunk ${chunkId}`);
        resolve(false);
        return;
      }

      console.log(`[ChunkErrorHandler] Retrying chunk ${chunkId}, attempt ${retryCount + 1}/${MAX_RETRIES}`);

      // Update retry count
      failedChunks.set(chunkId, retryCount + 1);

      // Create a notification to show retry is in progress
      const retryNotification = document.createElement('div');
      retryNotification.id = 'chunk-retry-notification';
      retryNotification.style.position = 'fixed';
      retryNotification.style.top = '0';
      retryNotification.style.left = '0';
      retryNotification.style.width = '100%';
      retryNotification.style.padding = '0.5rem';
      retryNotification.style.backgroundColor = '#cce5ff';
      retryNotification.style.color = '#004085';
      retryNotification.style.textAlign = 'center';
      retryNotification.style.zIndex = '9999';
      retryNotification.innerHTML = `
        <p>Retrying to load resources... (${retryCount + 1}/${MAX_RETRIES})</p>
      `;

      // Only add the notification if it doesn't already exist
      if (!document.getElementById('chunk-retry-notification')) {
        document.body.appendChild(retryNotification);
      }

      // Set a flag to indicate we're retrying
      isRetrying = true;

      // Force reload all JavaScript files
      // This is a simple approach that reloads all script tags
      const scripts = document.querySelectorAll('script[src]');
      let loadedScripts = 0;
      const totalScripts = scripts.length;

      if (totalScripts === 0) {
        // If there are no scripts to reload, try reloading the page after a delay
        setTimeout(() => {
          isRetrying = false;
          // Remove the notification if it exists and is a child of document.body
          const notification = document.getElementById('chunk-retry-notification');
          if (notification && notification.parentNode === document.body) {
            document.body.removeChild(notification);
          }
          resolve(false);
        }, 2000);
        return;
      }

      scripts.forEach((script: HTMLScriptElement) => {
        const originalSrc = script.src;
        if (!originalSrc) {
          loadedScripts++;
          if (loadedScripts === totalScripts) {
            finishRetry();
          }
          return;
        }

        // Create a new script element
        const newScript = document.createElement('script');
        newScript.src = originalSrc.includes('?') 
          ? `${originalSrc}&retry=${Date.now()}` 
          : `${originalSrc}?retry=${Date.now()}`;

        // When the script loads or errors, update our counter
        newScript.onload = newScript.onerror = () => {
          loadedScripts++;
          if (loadedScripts === totalScripts) {
            finishRetry();
          }
        };

        // Add the new script to the document
        document.head.appendChild(newScript);
      });

      // Function to finish the retry process
      function finishRetry() {
        setTimeout(() => {
          isRetrying = false;
          // Remove the notification if it exists and is a child of document.body
          const notification = document.getElementById('chunk-retry-notification');
          if (notification && notification.parentNode === document.body) {
            document.body.removeChild(notification);
          }
          resolve(true);
        }, 1000);
      }

      // Set a timeout to prevent hanging if scripts don't load
      setTimeout(() => {
        if (isRetrying) {
          isRetrying = false;
          // Remove the notification if it exists and is a child of document.body
          const notification = document.getElementById('chunk-retry-notification');
          if (notification && notification.parentNode === document.body) {
            document.body.removeChild(notification);
          }
          resolve(false);
        }
      }, 10000); // 10 second timeout
    });
  };

  /**
   * Show error message with retry and refresh buttons
   */
  const showErrorMessage = (error: any) => {
    // Don't show error message if we're already retrying
    if (isRetrying || document.getElementById('chunk-error-message')) {
      return;
    }

    console.error('[ChunkErrorHandler] Showing error message for:', error);

    const chunkId = getChunkIdFromError(error);
    const retryCount = chunkId ? (failedChunks.get(chunkId) || 0) : 0;

    const errorMessage = document.createElement('div');
    errorMessage.id = 'chunk-error-message';
    errorMessage.style.position = 'fixed';
    errorMessage.style.top = '0';
    errorMessage.style.left = '0';
    errorMessage.style.width = '100%';
    errorMessage.style.padding = '1rem';
    errorMessage.style.backgroundColor = '#f8d7da';
    errorMessage.style.color = '#721c24';
    errorMessage.style.textAlign = 'center';
    errorMessage.style.zIndex = '9999';

    // Show different message based on retry count
    if (retryCount >= MAX_RETRIES) {
      errorMessage.innerHTML = `
        <p>There was an error loading some resources. Please try refreshing the page.</p>
        <button id="reload-btn" style="background-color: #721c24; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; margin-right: 0.5rem; cursor: pointer;">Refresh Page</button>
      `;
    } else {
      errorMessage.innerHTML = `
        <p>There was an error loading some resources.</p>
        <button id="retry-btn" style="background-color: #004085; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; margin-right: 0.5rem; cursor: pointer;">Retry</button>
        <button id="reload-btn" style="background-color: #721c24; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer;">Refresh Page</button>
      `;
    }

    document.body.appendChild(errorMessage);

    // Add event listener to the retry button
    document.getElementById('retry-btn')?.addEventListener('click', async () => {
      // Remove the error message if it exists and is a child of document.body
      if (errorMessage && errorMessage.parentNode === document.body) {
        document.body.removeChild(errorMessage);
      }

      if (chunkId) {
        // Try to reload the chunk
        const success = await retryLoadChunk(chunkId);

        // If retry failed and we've reached max retries, show error message again
        if (!success && (failedChunks.get(chunkId) || 0) >= MAX_RETRIES) {
          showErrorMessage(error);
        }
      }
    });

    // Add event listener to the reload button
    document.getElementById('reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
  };

  // Handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', async (event) => {
    const error = event.reason;

    // Check if this is a chunk loading error
    if (
      error && 
      (
        (typeof error.message === 'string' && error.message.includes('ChunkLoadError')) ||
        (error.name === 'ChunkLoadError') ||
        (typeof error.stack === 'string' && error.stack.includes('ChunkLoadError'))
      )
    ) {
      console.error('[ChunkErrorHandler] Caught chunk loading error:', error);

      // Prevent the error from propagating
      event.preventDefault();

      // Get chunk ID from error
      const chunkId = getChunkIdFromError(error);

      if (chunkId) {
        // If we haven't reached max retries, try to reload the chunk automatically
        const retryCount = failedChunks.get(chunkId) || 0;

        if (retryCount < MAX_RETRIES) {
          const success = await retryLoadChunk(chunkId);

          // If retry was successful, don't show error message
          if (success) return;
        }
      }

      // Show error message if automatic retry failed or we've reached max retries
      showErrorMessage(error);
    }
  });

  // Handler for global errors
  window.addEventListener('error', async (event) => {
    // Check if this is a script or chunk loading error
    if (
      event.error && 
      (
        (typeof event.error.message === 'string' && event.error.message.includes('ChunkLoadError')) ||
        (event.error.name === 'ChunkLoadError') ||
        (typeof event.error.stack === 'string' && event.error.stack.includes('ChunkLoadError'))
      )
    ) {
      console.error('[ChunkErrorHandler] Caught chunk loading error:', event.error);

      // Prevent the error from propagating
      event.preventDefault();

      // Get chunk ID from error
      const chunkId = getChunkIdFromError(event.error);

      if (chunkId) {
        // If we haven't reached max retries, try to reload the chunk automatically
        const retryCount = failedChunks.get(chunkId) || 0;

        if (retryCount < MAX_RETRIES) {
          const success = await retryLoadChunk(chunkId);

          // If retry was successful, don't show error message
          if (success) return;
        }
      }

      // Show error message if automatic retry failed or we've reached max retries
      showErrorMessage(event.error);
    }
  }, true);

  // Also listen for script error events (for older browsers)
  window.addEventListener('error', (event) => {
    // Check if this is a script loading error
    if (event.target && (event.target as HTMLElement).nodeName === 'SCRIPT') {
      console.error('[ChunkErrorHandler] Caught script loading error:', event);

      // Prevent the error from propagating
      event.preventDefault();

      // Show error message
      showErrorMessage({
        message: 'Script loading error',
        target: event.target
      });
    }
  }, true);

  // Informative log removed to reduce console output
}

export {};
