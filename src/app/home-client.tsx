'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import MazayaOffers from '@/components/mazaya-offers'
import NewOffersGrid from '@/components/new-offers-grid'
import { ChatButton } from '@/components/chat-button'
import PlatformLinks from '@/components/platform-links'
// import { VivaEngage } from '@/components/viva-engage' // COMMENTED OUT
import { useTheme } from '@/lib/theme-context'
import { CelebrationsComponent } from '@/components/celebrations'
import { UpcomingEvents } from '@/components/upcoming-events'
import { CompanyNews } from '@/components/company-news'
import { 
  Calendar, 
  MapPin, 
  Thermometer, 
  Gift, 
  Newspaper, 
  TrendingUp, 
  Users, 
  Plane, 
  Clock,
  ExternalLink,
  ChevronRight,
  Cake,
  Award,
  Briefcase,
  BarChart3,
  X,
  Maximize2,
  Mail,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

// Global variables to track newsletter loading state across renders and component instances
// We'll initialize it as false and check localStorage in the useEffect hook
const globalNewsletterLoaded = { 
  current: false
};

// Debounce mechanism to prevent rapid successive fetches
const lastFetchAttempt = { 
  timestamp: 0,
  minInterval: 5000 // Minimum 5 seconds between fetch attempts
};

function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [errorParam, setErrorParam] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Set mounted to true on client-side and handle URL params
  useEffect(() => {
    setMounted(true)

    // Only run on the client side
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const param = urlParams.get('error')
      setErrorParam(param)
      if (param) {
        setError(param)
      }
    }
  }, [])

  // Get error message based on error code
  const getErrorMessage = (errorCode: string) => {
    if (errorCode === 'OAuthCallback') return 'Authentication error. Please try again.';
    if (errorCode === 'Signin') return 'Sign in failed. Please try again.';
    return `Error: ${errorCode}`;
  };

  // Return the content without the outer div, as it will be wrapped by HomePage
  return (
    <GlassmorphismContainer className="max-w-md w-full p-8 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-flyadeal-yellow rounded-full flex items-center justify-center">
          <Plane className="w-8 h-8 text-flyadeal-purple" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 font-raleway">
          Welcome to Flyadeal Intranet
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Sign in with your Microsoft account to access the portal
        </p>

        {/* Always render the error container, but hide it when no error */}
        <div className={`mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg ${mounted && error ? 'block' : 'hidden'}`}>
          <p className="text-red-400 dark:text-red-300 text-sm">
            {error ? getErrorMessage(error) : ''}
          </p>
        </div>
      </div>

      <Button 
        onClick={() => signIn('azure-ad')}
        className="w-full bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90 font-semibold"
      >
        Sign in with Microsoft
      </Button>
    </GlassmorphismContainer>
  )
}

function DashboardPage() {
  const { theme } = useTheme()
  const { data: session, status } = useSession()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [weather, setWeather] = useState({ temp: 25, condition: 'Loading...', location: 'Fetching...' })
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [isWeatherFallback, setIsWeatherFallback] = useState(false)
  const [weatherFallbackReason, setWeatherFallbackReason] = useState<string | null>(null)
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
  // Start with a proper loading state instead of null to improve UX
  const [newsletter, setNewsletter] = useState<any>({
    title: "Loading Newsletter",
    content: `
      <div style="text-align: center; padding: 40px 20px; font-family: Arial, sans-serif;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #00539f; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
        <h3 style="color: #00539f; margin-bottom: 15px;">Loading Newsletter</h3>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Fetching the latest newsletter content from SharePoint...
        </p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `,
    lastUpdated: new Date().toISOString(),
    source: "loading",
    isLoading: true
  })
  const [newsletterError, setNewsletterError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])


  // Function to reset newsletter loading state and force a fresh fetch
  // This clears the localStorage flag, resets the debounce timestamp,
  // clears any error state, and reloads the page with a force_fetch parameter to ensure a fresh fetch
  const resetNewsletterLoadingState = () => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      globalNewsletterLoaded.current = false
      lastFetchAttempt.timestamp = 0 // Reset the debounce timestamp
      setNewsletterError(null) // Clear any error state

      localStorage.removeItem('newsletterLoaded')

      // Reload the page with force_fetch parameter to ensure a fresh fetch
      const url = new URL(window.location.href)
      url.searchParams.set('force_fetch', 'true')
      window.location.href = url.toString()
    }
  }

  useEffect(() => {
    // Set initial time
    setCurrentTime(new Date())
    // Update time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch weather data with geolocation
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setWeatherLoading(true);

        // Try to get user's location
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

              try {
                const response = await fetch('/api/weather', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ latitude, longitude }),
                  // Add credentials to ensure cookies are sent with the request
                  credentials: 'same-origin'
                });


                if (response.ok) {
                  const data = await response.json();

                  if (data.weatherData) {
                    const newWeather = {
                      temp: Math.round(data.weatherData.current.temp_c),
                      condition: data.weatherData.current.condition.text,
                      location: data.weatherData.location.name
                    };
                    setWeather(newWeather);

                    // Check if this is fallback data
                    if (data.isFallback) {
                      setIsWeatherFallback(true);
                      setWeatherFallbackReason(data.fallbackReason || 'Connectivity issue');
                    } else {
                      setIsWeatherFallback(false);
                      setWeatherFallbackReason(null);
                    }
                  } else {
                    throw new Error('Weather API response missing weatherData');
                  }
                } else {
                  throw new Error(`Weather API returned status ${response.status}`);
                }
              } catch (error: any) {

                // Use fallback if primary request fails
                await fetchFallbackWeather();
              } finally {
                setWeatherLoading(false);
              }
            },
            async (error) => {
              // Geolocation failed, use fallback (Jeddah)
              await fetchFallbackWeather();
            },
            {
              timeout: 15000, // Increase timeout to 15 seconds to give more time for geolocation
              maximumAge: 300000 // Cache location for 5 minutes
            }
          );
        } else {
          // Geolocation not available, use fallback
          await fetchFallbackWeather();
        }
      } catch (error) {
        setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
        setWeatherLoading(false);
      }
    };

    // Helper function to fetch fallback weather for Jeddah
    const fetchFallbackWeather = async () => {
      try {
        const response = await fetch('/api/weather', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude: 21.543333, longitude: 39.172778 }),
          // Add credentials to ensure cookies are sent with the request
          credentials: 'same-origin'
        });


        if (response.ok) {
          const data = await response.json();
          if (data.weatherData) {
            const fallbackWeather = {
              temp: Math.round(data.weatherData.current.temp_c),
              condition: data.weatherData.current.condition.text,
              location: data.weatherData.location.name
            };
            setWeather(fallbackWeather);

            // Check if this is fallback data from the API
            if (data.isFallback) {
              setIsWeatherFallback(true);
              setWeatherFallbackReason(data.fallbackReason || 'Connectivity issue');
            } else {
              // This is our own fallback request, so mark it as fallback
              setIsWeatherFallback(true);
              setWeatherFallbackReason('Using Jeddah weather data');
            }
          } else {
            // Use hardcoded values as last resort
            setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
            setIsWeatherFallback(true);
            setWeatherFallbackReason('Using default weather data');
          }
        } else {
          // Use hardcoded values as last resort
          setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
          setIsWeatherFallback(true);
          setWeatherFallbackReason('Using default weather data');
        }
      } catch (error: any) {

        // Set default values if all fails
        setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
        setIsWeatherFallback(true);
        setWeatherFallbackReason('Network connectivity issue');
      } finally {
        setWeatherLoading(false);
      }
    };

    // Only fetch weather after component is mounted and user is authenticated
    if (session && isClient) {
      fetchWeatherData();
    }
  }, [status, isClient])

  // Newsletter loading effect - only runs on client side
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (typeof window === 'undefined') {
      return;
    }

    // Check if user is authenticated before proceeding
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !session) {
      return;
    }
    
    // CRITICAL: First check if we have fallback content cached and clear it
    const cachedNewsletterData = localStorage.getItem('newsletterData');
    if (cachedNewsletterData) {
      try {
        const parsedData = JSON.parse(cachedNewsletterData);
        if (parsedData.isFallback || parsedData.source === 'system') {
          localStorage.removeItem('newsletterData');
          localStorage.removeItem('newsletterLoaded');
          globalNewsletterLoaded.current = false;
        }
      } catch (e) {
        // Error parsing cached data - silently clear it
        localStorage.removeItem('newsletterData');
        localStorage.removeItem('newsletterLoaded');
        globalNewsletterLoaded.current = false;
      }
    }

    // Check if newsletter has already been loaded in this session
    const newsletterLoaded = localStorage.getItem('newsletterLoaded') === 'true';
    globalNewsletterLoaded.current = newsletterLoaded;

    if (newsletterLoaded) {

      // Try to get newsletter data from localStorage
      const storedNewsletter = localStorage.getItem('newsletterData');
      if (storedNewsletter) {
        try {
          const parsedNewsletter = JSON.parse(storedNewsletter);

          // Check if the stored newsletter is valid (not an error or loading state)
          // FIXED: Removed system source check to allow fallback content to be displayed

          const hasNewsletter = !!parsedNewsletter;
          const hasContent = !!parsedNewsletter?.content;
          const notLoadingTitle = parsedNewsletter?.title !== "Loading Newsletter";
          const notErrorTitle = parsedNewsletter?.title !== "Newsletter Error";
          const notTempUnavailableTitle = parsedNewsletter?.title !== "Newsletter Temporarily Unavailable";
          const notServiceUnavailableTitle = parsedNewsletter?.title !== "Newsletter Service Temporarily Unavailable";

          // FIXED: Only reject based on specific error titles, not the source
          // This allows system-generated fallback content to be displayed properly
          // CRITICAL: Also check for fallback content to force fresh fetch
          const notFallbackContent = !parsedNewsletter?.isFallback;
          const isValidNewsletter = hasNewsletter && hasContent && notLoadingTitle && notErrorTitle && notTempUnavailableTitle && notServiceUnavailableTitle && notFallbackContent;

          if (isValidNewsletter) {
            setNewsletter(parsedNewsletter);
          } else {
            // Clear the flag since we have invalid data
            localStorage.removeItem('newsletterLoaded');
            localStorage.removeItem('newsletterData');
            globalNewsletterLoaded.current = false;

            // Set a temporary loading state message
            const loadingNewsletter = {
              title: "Loading Newsletter",
              content: "<div style='text-align: center; padding: 20px;'><p>Retrieving the latest newsletter...</p></div>",
              lastUpdated: new Date().toISOString(),
              source: "system"
            };

            setNewsletter(loadingNewsletter);

            // Trigger a fetch with a slight delay to ensure UI updates first
            setTimeout(() => {
              // Continue with the fetch logic below (outside this if/else)
              const now = Date.now();
              lastFetchAttempt.timestamp = now;

              fetch('/api/sharepoint/newsletter')
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                  }
                  return response.json();
                })
                .then(data => {
                  if (data.success && data.newsletter) {
                    setNewsletter(data.newsletter);
                    localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
                    localStorage.setItem('newsletterLoaded', 'true');
                    globalNewsletterLoaded.current = true;
                  } else if (!data.success && data.fallbackContent) {
                    // API returned error but provided fallback content
                    setNewsletter(data.fallbackContent);
                    // Don't cache fallback content - this allows retry on next visit
                    // Don't set newsletterLoaded flag either
                  } else {
                    throw new Error(data.error || 'Unknown error fetching newsletter');
                  }
                })
                .catch(error => {
                  setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);
                });
            }, 100);

            // Return early to avoid the normal fetch flow
            return;
          }
        } catch (error) {
          setNewsletterError('Error loading saved newsletter data. Please try refreshing the page.');
        }
      }

      return;
    }

    // Check URL parameters for force_fetch flag and other parameters
    const urlParams = new URLSearchParams(window.location.search);
    const forceFetch = urlParams.get('force_fetch') === 'true';

    // If newsletter hasn't been loaded or force_fetch is true, fetch it
    if (!globalNewsletterLoaded.current || forceFetch) {
      // Implement debounce to prevent rapid successive fetches
      const now = Date.now();
      if (now - lastFetchAttempt.timestamp < lastFetchAttempt.minInterval) {
        return;
      }

      lastFetchAttempt.timestamp = now;

      // Fetch the newsletter
      fetch('/api/sharepoint/newsletter-list')
        .then(response => {
          criticalLog(`Newsletter API response received - Status: ${response.status} ${response.statusText}`);

          // Log detailed response information
          criticalLog('Response details - DETAILED CHECK', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url,
            type: response.type,
            redirected: response.redirected,
            headers: {
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length'),
              cacheControl: response.headers.get('cache-control'),
              etag: response.headers.get('etag'),
              server: response.headers.get('server'),
              date: response.headers.get('date')
            }
          });

          infoLog('Response headers', {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
            cacheControl: response.headers.get('cache-control'),
            etag: response.headers.get('etag')
          });

          if (!response.ok) {
            errorLog(`API returned error status: ${response.status} ${response.statusText}`);

            // Special handling for 503 Service Unavailable (temporary maintenance)
            if (response.status === 503) {
              // Instead of throwing an error, set a fallback newsletter with a maintenance message
              setNewsletter({
                title: "Newsletter Service Temporarily Unavailable",
                content: "<div style='text-align: center; padding: 20px;'><p>The newsletter service is temporarily unavailable for maintenance.</p><p>Please check back later.</p></div>",
                lastUpdated: new Date().toISOString(),
                source: "system"
              });

              // Still log the error for monitoring
              // Don't save this fallback to localStorage for 503 errors
              // This will allow it to try fetching again on the next visit when the service might be available

              // Return early to avoid the error path
              return;
            } else {
              throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
          }
          return response.json();
        })
        .then(data => {
          // Log detailed information about the response data
          criticalLog('Newsletter API response data - DETAILED CHECK', {
            success: data.success,
            hasNewsletter: !!data.newsletter,
            error: data.error || 'none',
            details: data.details || 'none',
            dataKeys: Object.keys(data || {}),
            dataType: typeof data,
            isDataNull: data === null,
            isDataUndefined: data === undefined,
            rawDataSize: JSON.stringify(data || {}).length
          });

          infoLog('Newsletter API response data', {
            success: data.success,
            hasNewsletter: !!data.newsletter,
            error: data.error || 'none',
            details: data.details || 'none'
          });

          if (data.success && data.newsletter) {
            debugLog('✅ Newsletter fetched successfully', data.newsletter);
            criticalLog(`Newsletter fetch successful - Content length: ${data.newsletter.content?.length || 0} characters`);

            // Log detailed newsletter metadata
            criticalLog('Newsletter metadata - DETAILED CHECK', {
              title: data.newsletter.title,
              lastUpdated: data.newsletter.lastUpdated,
              source: data.newsletter.source,
              type: data.newsletter.type,
              sharePointUrl: data.newsletter.sharePointUrl || 'none',
              contentLength: data.newsletter.content?.length || 0,
              contentPreview: data.newsletter.content?.substring(0, 200) || 'no content',
              allKeys: Object.keys(data.newsletter || {})
            });

            infoLog('Newsletter metadata', {
              title: data.newsletter.title,
              lastUpdated: data.newsletter.lastUpdated,
              source: data.newsletter.source,
              type: data.newsletter.type,
              sharePointUrl: data.newsletter.sharePointUrl || 'none'
            });

            // Log state change before updating
            criticalLog('Setting newsletter state - SUCCESS PATH', {
              previousTitle: newsletter?.title || 'none',
              newTitle: data.newsletter.title,
              stateChange: `${newsletter?.title || 'none'} -> ${data.newsletter.title}`
            });

            setNewsletter(data.newsletter);

            // Log the state change with critical level to ensure it's always displayed
            criticalLog('Newsletter state set from API fetch - SUCCESS', {
              title: data.newsletter.title,
              contentLength: data.newsletter.content?.length || 0,
              lastUpdated: data.newsletter.lastUpdated,
              source: data.newsletter.source,
              stateChange: `${newsletter?.title || 'none'} -> ${data.newsletter.title}`,
              timestamp: new Date().toISOString()
            });

            // Save to localStorage to avoid refetching - but ONLY if it's not fallback content
            if (!data.newsletter.isFallback && data.newsletter.source !== 'system') {
              localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
              localStorage.setItem('newsletterLoaded', 'true');
              globalNewsletterLoaded.current = true;
              
              criticalLog('Newsletter is NOT fallback content - SAVING to localStorage', {
                isFallback: data.newsletter.isFallback,
                source: data.newsletter.source
              });
            } else {
              criticalLog('Newsletter IS fallback content - NOT saving to localStorage', {
                isFallback: data.newsletter.isFallback,
                source: data.newsletter.source,
                reason: 'Preventing fallback content from blocking future fetches'
              });
            }

            criticalLog('Newsletter data saved to localStorage - SUCCESS COMPLETE', {
              title: data.newsletter.title,
              dataSize: JSON.stringify(data.newsletter).length,
              globalLoaded: globalNewsletterLoaded.current,
              localStorageLoaded: localStorage.getItem('newsletterLoaded')
            });

          } else if (!data.success && data.fallbackContent) {
            // API returned error but provided fallback content
            setNewsletter(data.fallbackContent);
            // 🚨 CRITICAL: Don't cache fallback content - this allows retry on next visit
          } else {
            throw new Error(data.error || 'Unknown error fetching newsletter');
          }
        })
        .catch(error => {
          // Log detailed error information
          criticalLog('Newsletter fetch failed - CATCH BLOCK', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            errorType: typeof error,
            isNetworkError: error.name === 'TypeError' && error.message.includes('Failed to fetch'),
            currentNewsletterTitle: newsletter?.title || 'none',
            timestamp: new Date().toISOString(),
            fetchAttemptInfo: {
              lastAttemptTimestamp: lastFetchAttempt.timestamp,
              timeSinceAttempt: Date.now() - lastFetchAttempt.timestamp
            }
          });

          debugLog('❌ Error fetching newsletter', error);
          errorLog(`Newsletter fetch failed: ${error.message}`, {
            stack: error.stack,
            timestamp: new Date().toISOString()
          });

          // Check if it's a network error
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            criticalLog('Network error detected - possible connectivity issue or CORS problem');

            // Log state change for network error
            criticalLog('Setting newsletter state - NETWORK ERROR PATH', {
              previousTitle: newsletter?.title || 'none',
              newTitle: "Newsletter Temporarily Unavailable",
              stateChange: `${newsletter?.title || 'none'} -> Newsletter Temporarily Unavailable`,
              reason: 'network error'
            });

            // Provide a fallback for network errors too
            setNewsletter({
              title: "Newsletter Temporarily Unavailable",
              content: "<div style='text-align: center; padding: 20px;'><p>Unable to connect to the newsletter service.</p><p>This could be due to network connectivity issues.</p><p>Please check your connection and try again later.</p></div>",
              lastUpdated: new Date().toISOString(),
              source: "system"
            });

            // Don't save this fallback to localStorage for network errors
            // This will allow it to try fetching again on the next visit when SharePoint might be unblocked
            criticalLog('Not setting loaded flag for network error - RETRY STRATEGY', {
              reason: 'network error - allowing retry on next visit',
              globalLoaded: globalNewsletterLoaded.current,
              localStorageLoaded: localStorage.getItem('newsletterLoaded')
            });


            // Return early to avoid setting the error state
            return;
          }

          // Log state change for general error
          criticalLog('Setting newsletter state - GENERAL ERROR PATH', {
            previousTitle: newsletter?.title || 'none',
            newTitle: "Newsletter Error",
            stateChange: `${newsletter?.title || 'none'} -> Newsletter Error`,
            reason: 'general error',
            errorMessage: error.message
          });

          // For other errors, show a more user-friendly error message
          // but also provide a fallback newsletter content
          setNewsletter({
            title: "Newsletter Error",
            content: `<div style='text-align: center; padding: 20px;'>
              <p>We encountered an issue while loading the newsletter.</p>
              <p>Please try again later or contact IT support if the issue persists.</p>
              <p><small>Error details: ${error.message}</small></p>
            </div>`,
            lastUpdated: new Date().toISOString(),
            source: "system"
          });

          // Still set the error for debugging purposes
          setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);

          // Don't save this fallback to localStorage for errors
          // This will allow it to try fetching again on the next visit when the issue might be resolved
          criticalLog('Not setting loaded flag for general error - RETRY STRATEGY', {
            reason: 'general error - allowing retry on next visit',
            errorMessage: error.message,
            globalLoaded: globalNewsletterLoaded.current,
            localStorageLoaded: localStorage.getItem('newsletterLoaded')
          });

        });
    } else {
    }
  }, [status, isClient]) // Add isClient as a dependency to ensure this only runs on the client

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-28 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}! 👋
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Here's what's happening at Flyadeal today
                  </p>
                </div>
                <div className="text-right flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-6 h-6 text-orange-400/60" />
                    <div>
                      <div className="text-gray-800 dark:text-white font-semibold">
                        {weatherLoading ? '...' : `${weather.temp}°C`}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 text-xs">
                        {weatherLoading ? 'Loading weather...' : `${weather.condition}, ${weather.location}`}
                      </div>
                      {isWeatherFallback && !weatherLoading && (
                        <div className="text-amber-500 text-xs flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Offline data
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-800 dark:text-white text-lg font-semibold">
                      {isClient && currentTime ? currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      }) : '--:--'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-sm">
                      {isClient && currentTime ? currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Loading...'}
                    </div>
                  </div>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Platform Links */}
          <PlatformLinks />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Growth of Guests</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">+12%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Flying Hours</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">1,245</p>
                </div>
                <Clock className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Flights Growth</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">+8%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Guests Carried</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">156K</p>
                </div>
                <Users className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Total Flights</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">1,872</p>
                </div>
                <Plane className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Company News */}
              <CompanyNews />

              {/* Viva Engage - COMMENTED OUT */}
              {/* <GlassmorphismContainer className="p-6 mt-6 h-[calc(24rem+1.5rem)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                    Viva Engage
                  </h2>
                  <Button
                    onClick={() => window.open("https://web.yammer.com/embed/groups", "_blank")}
                    size="sm"
                    variant="outline"
                    className={theme === 'dark' 
                      ? "bg-gray-700/30 border-gray-400 text-gray-200 hover:bg-gray-600/50" 
                      : "bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                    }
                  >
                    <ExternalLink className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-gray-200' : ''}`} />
                    Open in Viva Engage
                  </Button>
                </div>
                <VivaEngage 
                  feedType="home"
                  theme={theme}
                />
              </GlassmorphismContainer> */}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Employee Offers */}
              <GlassmorphismContainer className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                    <Gift className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                    New Offers
                  </h2>
                  <Link href="/mazaya" className="text-sm text-flyadeal-purple hover:underline flex items-center">
                    View all offers
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <NewOffersGrid />
              </GlassmorphismContainer>

              {/* Upcoming Events */}
              <UpcomingEvents />

              {/* Birthdays & Anniversaries */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Celebrations
                </h2>

                <CelebrationsComponent />
              </GlassmorphismContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Button */}
      <ChatButton />
    </div>
  )
}

export function HomeClient() {
  const { theme } = useTheme()
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  // Set mounted to true on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle NextAuth errors - removed as error is not available in useSession

  // Determine which content to show, but don't conditionally render different components
  // This ensures the same DOM structure on both server and client for initial render
  const isLoading = status === 'loading' || !mounted
  const isAuthenticated = mounted && status === 'authenticated' && !!session
  const showLogin = mounted && (status === 'unauthenticated' || !session)

  return (
    <div className="min-h-screen">
      {/* Loading spinner - always rendered but visibility controlled by CSS */}
      <div className="min-h-screen flex items-center justify-center" data-state={isLoading ? "visible" : "hidden"} 
           style={{display: isLoading ? "flex" : "none"}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
      </div>

      {/* Login page - always rendered but visibility controlled by CSS */}
      <div className="min-h-screen flex items-center justify-center" data-state={showLogin ? "visible" : "hidden"}
           style={{display: showLogin ? "flex" : "none"}}>
        <LoginPage />
      </div>

      {/* Dashboard - always rendered but visibility controlled by CSS */}
      <div data-state={isAuthenticated ? "visible" : "hidden"}
           style={{display: isAuthenticated ? "block" : "none"}}>
        <DashboardPage />
      </div>
    </div>
  )
}
