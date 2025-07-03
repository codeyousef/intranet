/**
 * Chunk Preloader
 * 
 * This module preloads critical chunks to prevent chunk loading errors.
 * It works by identifying important chunks based on the current route
 * and preloading them before they're needed.
 */

// Only run in browser environment
if (typeof window !== 'undefined') {
  // Track which chunks we've already preloaded
  const preloadedChunks = new Set<string>();

  /**
   * Preload a JavaScript file
   * 
   * Uses a more efficient approach that doesn't trigger browser warnings about
   * preloaded resources not being used within a few seconds
   */
  const preloadScript = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Skip if already preloaded
      if (preloadedChunks.has(url)) {
        resolve();
        return;
      }

      // Mark as preloaded
      preloadedChunks.add(url);

      // Create a script element with async attribute instead of using preload
      // This approach doesn't trigger the "resource was preloaded but not used" warnings
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true; // Use defer to not block rendering
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-preloaded', 'true');

      // Handle load and error events
      script.onload = () => {
        resolve();
      };

      script.onerror = (error) => {
        console.error(`[ChunkPreloader] Failed to preload: ${url}`, error);
        // Don't reject, just resolve so we can continue with other preloads
        resolve();
      };

      // Add to document head
      document.head.appendChild(script);
    });
  };

  /**
   * Preload all script chunks on the page
   */
  const preloadAllChunks = async (): Promise<void> => {
    try {
      // Find all script tags with src attribute
      const scripts = Array.from(document.querySelectorAll('script[src]'))
        .map((script) => script.getAttribute('src'))
        .filter((src): src is string => src !== null && src.includes('chunk'));

      // Preload each script
      await Promise.all(scripts.map(preloadScript));

      // Informative log removed to reduce console output
    } catch (error) {
      console.error('[ChunkPreloader] Error preloading chunks:', error);
    }
  };

  /**
   * Preload chunks for a specific route
   */
  const preloadRouteChunks = async (route: string): Promise<void> => {
    try {
      // Get the manifest to find chunks for this route
      // This is a simplified approach - in a real app, you might need to
      // parse the webpack manifest to find the exact chunks for each route
      const routeSegments = route.split('/').filter(Boolean);

      // Find all script tags that might be related to this route
      const scripts = Array.from(document.querySelectorAll('script[src]'))
        .map((script) => script.getAttribute('src'))
        .filter((src): src is string => {
          if (!src || !src.includes('chunk')) return false;

          // Check if any route segment is in the script name
          return routeSegments.some(segment => 
            src.includes(`${segment}`) || 
            src.includes(segment.toLowerCase())
          );
        });

      // Preload each script
      await Promise.all(scripts.map(preloadScript));

      // Informative log removed to reduce console output
    } catch (error) {
      console.error(`[ChunkPreloader] Error preloading chunks for route ${route}:`, error);
    }
  };

  /**
   * Preload the Viva Engage auth chunk specifically
   */
  const preloadVivaEngageAuthChunk = async (): Promise<void> => {
    try {
      // Directly preload the 4-auth-msal.js file from the root path
      // This bypasses the assetPrefix for this specific file
      await preloadScript('/4-auth-msal.js');

      // No need for additional script element since preloadScript now uses script tags

      console.log('[ChunkPreloader] Preloaded Viva Engage auth chunk');
    } catch (error) {
      console.error('[ChunkPreloader] Error preloading Viva Engage auth chunk:', error);
    }
  };

  /**
   * Initialize the chunk preloader
   */
  const initChunkPreloader = (): void => {
    // Preload Viva Engage auth chunk immediately
    preloadVivaEngageAuthChunk();

    // Preload all chunks on page load
    window.addEventListener('load', () => {
      // Use a small delay to ensure the page is fully loaded
      setTimeout(() => {
        preloadAllChunks();
      }, 1000);
    });

    // Preload chunks when route changes
    // This works with both Next.js router and regular navigation
    const handleRouteChange = () => {
      const currentRoute = window.location.pathname;
      preloadRouteChunks(currentRoute);
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Try to detect Next.js route changes
    // This is a simplified approach - in a real app, you might want to
    // use the Next.js router events directly
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      handleRouteChange();
      return result;
    };

    // Initial preload for current route
    preloadRouteChunks(window.location.pathname);

    // Informative log removed to reduce console output
  };

  // Initialize the preloader
  initChunkPreloader();
}

export {};
