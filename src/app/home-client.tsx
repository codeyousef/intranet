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
        <h1 className="text-3xl font-bold text-gray-800 mb-2 font-raleway">
          Welcome to Flyadeal Intranet
        </h1>
        <p className="text-gray-600">
          Sign in with your Microsoft account to access the portal
        </p>

        {/* Always render the error container, but hide it when no error */}
        <div className={`mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg ${mounted && error ? 'block' : 'hidden'}`}>
          <p className="text-red-400 text-sm">
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
  const [newsletter, setNewsletter] = useState<any>(null)
  const [newsletterError, setNewsletterError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Log component render state for debugging (only in development and only on client)
  const renderState = {
    hasSession: !!session,
    hasNewsletter: !!newsletter,
    hasNewsletterError: !!newsletterError,
    newsletterModalOpen,
    isClient
  };

  // Only run this on the client side
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && localStorage.getItem('debug') === 'true') {
      console.log('🔄 DashboardPage rendering with:', renderState)
    }
  }, [renderState]);

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
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('debug') === 'true') {
        console.log('🔄 Newsletter loading state and debounce timestamp reset')
      }

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
        console.log('Starting weather fetch...');
        setWeatherLoading(true);

        // Try to get user's location
        if ('geolocation' in navigator) {
          console.log('Geolocation available, requesting permission...');
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              console.log('Got location:', latitude, longitude);

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

                console.log('Weather API response status:', response.status);

                if (response.ok) {
                  const data = await response.json();
                  console.log('Weather data received:', data);

                  if (data.weatherData) {
                    const newWeather = {
                      temp: Math.round(data.weatherData.current.temp_c),
                      condition: data.weatherData.current.condition.text,
                      location: data.weatherData.location.name
                    };
                    console.log('Setting weather to:', newWeather);
                    setWeather(newWeather);

                    // Check if this is fallback data
                    if (data.isFallback) {
                      console.log('Using fallback weather data:', data.fallbackReason || 'Unknown reason');
                      setIsWeatherFallback(true);
                      setWeatherFallbackReason(data.fallbackReason || 'Connectivity issue');
                    } else {
                      setIsWeatherFallback(false);
                      setWeatherFallbackReason(null);
                    }
                  } else {
                    console.error('Weather API response missing weatherData:', data);
                    throw new Error('Weather API response missing weatherData');
                  }
                } else {
                  console.error('Weather API error:', response.status, response.statusText);
                  // Try to get more detailed error information
                  try {
                    const errorData = await response.text();
                    console.error('Weather API error details:', errorData);
                  } catch (textError) {
                    console.error('Could not read error response text:', textError);
                  }
                  throw new Error(`Weather API returned status ${response.status}`);
                }
              } catch (error: any) {
                console.error('Error fetching weather:', error);

                // Check if it's a network error
                const isNetworkError = 
                  error.name === 'TypeError' && 
                  (error.message.includes('Failed to fetch') || 
                   error.message.includes('Network request failed') ||
                   error.message.includes('Network error') ||
                   error.message.includes('network timeout'));

                if (isNetworkError) {
                  console.error('Weather API network error detected - connectivity issue');
                }

                // Use fallback if primary request fails
                await fetchFallbackWeather();
              } finally {
                setWeatherLoading(false);
              }
            },
            async (error) => {
              // Geolocation failed, use fallback (Jeddah)
              console.log('Geolocation error:', error, 'using fallback location');
              await fetchFallbackWeather();
            },
            {
              timeout: 15000, // Increase timeout to 15 seconds to give more time for geolocation
              maximumAge: 300000 // Cache location for 5 minutes
            }
          );
        } else {
          // Geolocation not available, use fallback
          console.log('Geolocation not available in this browser, using fallback location');
          await fetchFallbackWeather();
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
        setWeatherLoading(false);
      }
    };

    // Helper function to fetch fallback weather for Jeddah
    const fetchFallbackWeather = async () => {
      console.log('Fetching fallback weather for Jeddah');
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

        console.log('Fallback weather API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          if (data.weatherData) {
            const fallbackWeather = {
              temp: Math.round(data.weatherData.current.temp_c),
              condition: data.weatherData.current.condition.text,
              location: data.weatherData.location.name
            };
            console.log('Setting fallback weather to:', fallbackWeather);
            setWeather(fallbackWeather);

            // Check if this is fallback data from the API
            if (data.isFallback) {
              console.log('Using API-provided fallback weather data:', data.fallbackReason || 'Unknown reason');
              setIsWeatherFallback(true);
              setWeatherFallbackReason(data.fallbackReason || 'Connectivity issue');
            } else {
              // This is our own fallback request, so mark it as fallback
              setIsWeatherFallback(true);
              setWeatherFallbackReason('Using Jeddah weather data');
            }
          } else {
            console.error('Fallback weather API response missing weatherData:', data);
            // Use hardcoded values as last resort
            setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
            setIsWeatherFallback(true);
            setWeatherFallbackReason('Using default weather data');
          }
        } else {
          console.error('Fallback weather API error:', response.status, response.statusText);
          // Try to get more detailed error information
          try {
            const errorData = await response.text();
            console.error('Fallback weather API error details:', errorData);
          } catch (textError) {
            console.error('Could not read fallback error response text:', textError);
          }
          // Use hardcoded values as last resort
          setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
          setIsWeatherFallback(true);
          setWeatherFallbackReason('Using default weather data');
        }
      } catch (error: any) {
        console.error('Error fetching fallback weather:', error);

        // Check if it's a network error
        const isNetworkError = 
          error.name === 'TypeError' && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('Network request failed') ||
           error.message.includes('Network error') ||
           error.message.includes('network timeout'));

        if (isNetworkError) {
          console.error('Fallback weather API network error detected - connectivity issue');
        }

        // Set default values if all fails
        setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
        setIsWeatherFallback(true);
        setWeatherFallbackReason('Network connectivity issue');
      } finally {
        setWeatherLoading(false);
      }
    };

    // Only fetch weather after component is mounted and user is authenticated
    console.log('Weather useEffect triggered. Session:', !!session, 'isClient:', isClient);
    // Use session.status instead of undefined status variable
    if (session && isClient) {
      fetchWeatherData();
    }
  }, [status, isClient])

  // Newsletter loading effect - only runs on client side
  useEffect(() => {
    // ULTRA-AGGRESSIVE LOGGING - Log absolutely everything at the start
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] useEffect ENTRY POINT - ${new Date().toISOString()}`);
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Window check: ${typeof window !== 'undefined' ? 'CLIENT' : 'SERVER'}`);
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Dependencies: status="${status}", isClient=${isClient}`);
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Session: hasSession=${!!session}, email=${session?.user?.email || 'none'}`);
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Newsletter state: title="${newsletter?.title || 'none'}"`);
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Global loaded: ${globalNewsletterLoaded.current}`);

    // Skip this effect during server-side rendering
    if (typeof window === 'undefined') {
      console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] EXITING - server-side rendering detected');
      return;
    }

    console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] PASSED window check - proceeding');

    // Log when the useEffect runs and why
    console.error(`🚨 [NEWSLETTER-ULTRA-CRITICAL] Newsletter useEffect triggered at ${new Date().toISOString()}`, {
      sessionStatus: status,
      hasSession: !!session,
      userEmail: session?.user?.email || 'none',
      isClient,
      dependencies: { status, isClient },
      currentNewsletterTitle: newsletter?.title || 'none',
      globalNewsletterLoaded: globalNewsletterLoaded.current,
      localStorage: {
        newsletterLoaded: typeof window !== 'undefined' ? localStorage.getItem('newsletterLoaded') : 'unavailable',
        hasNewsletterData: typeof window !== 'undefined' ? !!localStorage.getItem('newsletterData') : false
      }
    });

    // Check if user is authenticated before proceeding
    if (status === 'loading') {
      console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] EXITING - Session still loading');
      return;
    }

    console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] PASSED loading check - status is not loading');

    if (status === 'unauthenticated' || !session) {
      console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] EXITING - User not authenticated', {
        status,
        hasSession: !!session
      });
      return;
    }

    console.error('🚨 [NEWSLETTER-ULTRA-CRITICAL] PASSED authentication check - user is authenticated');

    console.error('[NEWSLETTER-CRITICAL] User authenticated - proceeding with newsletter logic', {
      status,
      userEmail: session.user?.email || 'none'
    });

    console.error('[NEWSLETTER-CRITICAL] About to create logging functions');

    // Create enhanced logging functions with actual implementation for debugging
    const debugLog = (message: any, ...args: any[]) => {
      console.debug(`[NEWSLETTER-DEBUG] ${message}`, ...args);
    };

    // Critical logs are always shown regardless of log level
    const criticalLog = (message: any, ...args: any[]) => {
      console.error(`[NEWSLETTER-CRITICAL] ${message}`, ...args);
    };

    // Info logs for important information
    const infoLog = (message: any, ...args: any[]) => {
      console.log(`[NEWSLETTER-INFO] ${message}`, ...args);
    };

    // Error logs are always shown
    const errorLog = (message: any, ...args: any[]) => {
      console.error(`[NEWSLETTER-ERROR] ${message}`, ...args);
    };

    console.error('[NEWSLETTER-CRITICAL] About to check newsletter loading state');

    // Check if newsletter has already been loaded in this session
    const newsletterLoaded = localStorage.getItem('newsletterLoaded') === 'true';
    globalNewsletterLoaded.current = newsletterLoaded;

    console.error('[NEWSLETTER-CRITICAL] Newsletter loading state checked', {
      newsletterLoaded,
      globalNewsletterLoaded: globalNewsletterLoaded.current,
      localStorageValue: localStorage.getItem('newsletterLoaded')
    });

    infoLog(`Newsletter loading state check: ${newsletterLoaded ? 'Already loaded' : 'Not loaded yet'}`);

    if (newsletterLoaded) {
      console.error('[NEWSLETTER-CRITICAL] Newsletter marked as loaded - checking localStorage data');
      debugLog('🔍 Newsletter already loaded in this session, checking localStorage for data');
      infoLog('Attempting to load newsletter from localStorage');

      // Try to get newsletter data from localStorage
      const storedNewsletter = localStorage.getItem('newsletterData');
      if (storedNewsletter) {
        try {
          const parsedNewsletter = JSON.parse(storedNewsletter);

          // Check if the stored newsletter is valid (not an error or loading state)
          const isValidNewsletter =
            parsedNewsletter &&
            parsedNewsletter.content &&
            parsedNewsletter.title !== "Loading Newsletter" &&
            parsedNewsletter.title !== "Newsletter Error" &&
            parsedNewsletter.title !== "Newsletter Temporarily Unavailable" &&
            parsedNewsletter.title !== "Newsletter Service Temporarily Unavailable";

          // Log detailed validation information to help debug issues
          criticalLog('Validating stored newsletter - DETAILED CHECK', {
            isValid: isValidNewsletter,
            title: parsedNewsletter?.title || 'unknown',
            hasContent: !!parsedNewsletter?.content,
            contentLength: parsedNewsletter?.content?.length || 0,
            source: parsedNewsletter?.source || 'unknown',
            lastUpdated: parsedNewsletter?.lastUpdated || 'unknown',
            failedChecks: {
              noNewsletter: !parsedNewsletter,
              noContent: !parsedNewsletter?.content,
              loadingTitle: parsedNewsletter?.title === "Loading Newsletter",
              errorTitle: parsedNewsletter?.title === "Newsletter Error",
              tempUnavailableTitle: parsedNewsletter?.title === "Newsletter Temporarily Unavailable",
              serviceUnavailableTitle: parsedNewsletter?.title === "Newsletter Service Temporarily Unavailable",
              systemSource: parsedNewsletter?.source === "system"
            }
          });

          debugLog('🔍 Validating stored newsletter', {
            isValid: isValidNewsletter,
            title: parsedNewsletter?.title || 'unknown',
            hasContent: !!parsedNewsletter?.content,
            source: parsedNewsletter?.source || 'unknown'
          });

          if (isValidNewsletter) {
            setNewsletter(parsedNewsletter);

            // Log the state change with critical level to ensure it's always displayed
            criticalLog('Newsletter state set from localStorage - SUCCESS', {
              title: parsedNewsletter.title,
              contentLength: parsedNewsletter.content?.length || 0,
              lastUpdated: parsedNewsletter.lastUpdated,
              source: parsedNewsletter.source,
              stateChange: `${newsletter?.title || 'none'} -> ${parsedNewsletter.title}`,
              timestamp: new Date().toISOString()
            });

            debugLog('✅ Loaded newsletter data from localStorage', parsedNewsletter);
            infoLog('Successfully loaded newsletter from localStorage', {
              title: parsedNewsletter.title,
              contentLength: parsedNewsletter.content?.length || 0,
              lastUpdated: parsedNewsletter.lastUpdated,
              source: parsedNewsletter.source
            });
          } else {
            debugLog('⚠️ Stored newsletter is in error/loading state - forcing fresh fetch', {
              title: parsedNewsletter?.title || 'unknown',
              source: parsedNewsletter?.source || 'unknown'
            });
            infoLog('Stored newsletter is in error/loading state - forcing fresh fetch');

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

            // Log the state change with critical level to ensure it's always displayed
            criticalLog('Newsletter state set to loading - INVALID STORED DATA', {
              title: loadingNewsletter.title,
              stateChange: `${newsletter?.title || 'none'} -> ${loadingNewsletter.title}`,
              reason: 'invalid stored data detected',
              timestamp: new Date().toISOString()
            });

            // Trigger a fetch with a slight delay to ensure UI updates first
            infoLog('Triggering fetch due to invalid stored data');
            setTimeout(() => {
              // Continue with the fetch logic below (outside this if/else)
              const now = Date.now();
              lastFetchAttempt.timestamp = now;
              debugLog('🔄 Fetching newsletter from API');
              criticalLog(`Initiating newsletter fetch from API at ${new Date().toISOString()}`);

              fetch('/api/sharepoint/newsletter-list')
                .then(response => {
                  criticalLog(`Newsletter API response received - Status: ${response.status} ${response.statusText}`);

                  if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                  }
                  return response.json();
                })
                .then(data => {
                  if (data.success && data.newsletter) {
                    debugLog('✅ Newsletter fetched successfully', data.newsletter);
                    setNewsletter(data.newsletter);
                    localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
                    localStorage.setItem('newsletterLoaded', 'true');
                    globalNewsletterLoaded.current = true;
                  } else {
                    throw new Error(data.error || 'Unknown error fetching newsletter');
                  }
                })
                .catch(error => {
                  errorLog(`Newsletter fetch failed: ${error.message}`);
                  setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);
                });
            }, 100);

            // Return early to avoid the normal fetch flow
            return;
          }
        } catch (error) {
          debugLog('❌ Error parsing newsletter data from localStorage', error);
          errorLog('Failed to parse newsletter data from localStorage', error);
          setNewsletterError('Error loading saved newsletter data. Please try refreshing the page.');
        }
      } else {
        infoLog('No newsletter data found in localStorage despite loaded flag being set');
      }

      return;
    }

    // Check URL parameters for force_fetch flag and other parameters
    const urlParams = new URLSearchParams(window.location.search);
    const forceFetch = urlParams.get('force_fetch') === 'true';
    const clearCache = urlParams.get('clear_cache') === 'true';
    const debugMode = urlParams.get('debug_newsletter') === 'true';
    const fetchTimestamp = parseInt(urlParams.get('fetch_ts') || '0', 10);
    const currentTimestamp = Date.now();
    const timeSinceLastFetch = currentTimestamp - lastFetchAttempt.timestamp;

    // Log detailed information about URL parameters and fetch decision
    criticalLog('URL parameters and fetch decision - DETAILED CHECK', {
      forceFetch,
      clearCache,
      debugMode,
      fetchTimestamp: fetchTimestamp > 0 ? new Date(fetchTimestamp).toISOString() : 'none',
      currentTimestamp: new Date(currentTimestamp).toISOString(),
      lastFetchTimestamp: lastFetchAttempt.timestamp > 0 ? new Date(lastFetchAttempt.timestamp).toISOString() : 'never',
      timeSinceLastFetch: `${Math.round(timeSinceLastFetch / 1000)} seconds`,
      newsletterLoaded: globalNewsletterLoaded.current,
      shouldFetch: !globalNewsletterLoaded.current || forceFetch,
      localStorage: {
        newsletterLoaded: localStorage.getItem('newsletterLoaded'),
        hasNewsletterData: !!localStorage.getItem('newsletterData'),
        newsletterDataSize: localStorage.getItem('newsletterData')?.length || 0
      }
    });

    infoLog(`Force fetch parameter check: ${forceFetch ? 'Force fetch requested' : 'Normal fetch flow'}`);

    console.error('[NEWSLETTER-CRITICAL] About to check if should fetch newsletter', {
      globalNewsletterLoaded: globalNewsletterLoaded.current,
      forceFetch,
      shouldFetch: !globalNewsletterLoaded.current || forceFetch
    });

    // If newsletter hasn't been loaded or force_fetch is true, fetch it
    if (!globalNewsletterLoaded.current || forceFetch) {
      console.error('[NEWSLETTER-CRITICAL] Decided to fetch newsletter - entering fetch logic');
      // Implement debounce to prevent rapid successive fetches
      const now = Date.now();
      if (now - lastFetchAttempt.timestamp < lastFetchAttempt.minInterval) {
        debugLog('🔒 Fetch attempt too soon after previous attempt, skipping');
        infoLog(`Debounce protection triggered - last attempt was ${now - lastFetchAttempt.timestamp}ms ago (minimum interval: ${lastFetchAttempt.minInterval}ms)`);
        return;
      }

      lastFetchAttempt.timestamp = now;
      debugLog('🔄 Fetching newsletter from API');
      criticalLog(`Initiating newsletter fetch from API at ${new Date().toISOString()}`);

      // Log browser and environment information for troubleshooting
      criticalLog('Environment information - DETAILED CHECK', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        windowDimensions: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        endpoint: '/api/sharepoint/newsletter-list',
        sessionInfo: {
          hasSession: !!session,
          userEmail: session?.user?.email || 'unknown'
        },
        fetchAttemptInfo: {
          lastAttemptTimestamp: lastFetchAttempt.timestamp,
          timeSinceLastAttempt: now - lastFetchAttempt.timestamp,
          minInterval: lastFetchAttempt.minInterval
        }
      });

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
              console.warn("Newsletter service is in maintenance mode (503)");

              // Don't save this fallback to localStorage for 503 errors
              // This will allow it to try fetching again on the next visit when the service might be available
              console.log('[NEWSLETTER] Not setting loaded flag for 503 error - allowing retry on next visit');

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

            // Save to localStorage to avoid refetching
            localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
            localStorage.setItem('newsletterLoaded', 'true');
            globalNewsletterLoaded.current = true;

            criticalLog('Newsletter data saved to localStorage - SUCCESS COMPLETE', {
              title: data.newsletter.title,
              dataSize: JSON.stringify(data.newsletter).length,
              globalLoaded: globalNewsletterLoaded.current,
              localStorageLoaded: localStorage.getItem('newsletterLoaded')
            });

            infoLog('Newsletter data saved to localStorage');
          } else {
            // Log detailed error information
            criticalLog('API returned success:false or missing newsletter data - ERROR PATH', {
              success: data.success,
              error: data.error || 'Unknown error',
              details: data.details || 'No details provided',
              hasNewsletter: !!data.newsletter,
              dataKeys: Object.keys(data || {}),
              currentNewsletterTitle: newsletter?.title || 'none'
            });

            errorLog('API returned success:false or missing newsletter data', {
              success: data.success,
              error: data.error || 'Unknown error',
              details: data.details || 'No details provided'
            });

            // If there's a newsletter object in the error response, log its details
            if (data.newsletter) {
              criticalLog('Error response included newsletter fallback content - FALLBACK CHECK', {
                title: data.newsletter.title,
                contentLength: data.newsletter.content?.length || 0,
                source: data.newsletter.source,
                allKeys: Object.keys(data.newsletter || {})
              });

              infoLog('Error response included newsletter fallback content', {
                title: data.newsletter.title,
                contentLength: data.newsletter.content?.length || 0,
                source: data.newsletter.source
              });
            }

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

            console.log('[NEWSLETTER] Not setting loaded flag for network error - allowing retry on next visit');

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

          console.log('[NEWSLETTER] Not setting loaded flag for error - allowing retry on next visit');
        });
    } else {
      console.error('[NEWSLETTER-CRITICAL] Newsletter fetch skipped - already loaded', {
        globalLoaded: globalNewsletterLoaded.current,
        forceFetch,
        currentNewsletterTitle: newsletter?.title || 'none',
        localStorage: {
          newsletterLoaded: localStorage.getItem('newsletterLoaded'),
          hasNewsletterData: !!localStorage.getItem('newsletterData'),
          newsletterDataSize: localStorage.getItem('newsletterData')?.length || 0
        },
        skipReason: 'already loaded in this session'
      });

      // Log detailed information about why the fetch is being skipped
      criticalLog('Newsletter fetch skipped - ALREADY LOADED CHECK', {
        globalLoaded: globalNewsletterLoaded.current,
        forceFetch,
        currentNewsletterTitle: newsletter?.title || 'none',
        localStorage: {
          newsletterLoaded: localStorage.getItem('newsletterLoaded'),
          hasNewsletterData: !!localStorage.getItem('newsletterData'),
          newsletterDataSize: localStorage.getItem('newsletterData')?.length || 0
        },
        skipReason: 'already loaded in this session'
      });

      debugLog('🔍 Newsletter already loaded in this session, skipping fetch');
      infoLog('Newsletter fetch skipped - already loaded in this session');
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
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}! 👋
                  </h1>
                  <p className="text-gray-600">
                    Here's what's happening at Flyadeal today
                  </p>
                </div>
                <div className="text-right flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-6 h-6 text-orange-400/60" />
                    <div>
                      <div className="text-gray-800 font-semibold">
                        {weatherLoading ? '...' : `${weather.temp}°C`}
                      </div>
                      <div className="text-gray-600 text-xs">
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
                    <div className="text-gray-800 text-lg font-semibold">
                      {isClient && currentTime ? currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      }) : '--:--'}
                    </div>
                    <div className="text-gray-600 text-sm">
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
                  <p className="text-gray-600 text-sm">Growth of Guests</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">+12%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Flying Hours</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">1,245</p>
                </div>
                <Clock className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Flights Growth</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">+8%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Guests Carried</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">156K</p>
                </div>
                <Users className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Flights</p>
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
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
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
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
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
