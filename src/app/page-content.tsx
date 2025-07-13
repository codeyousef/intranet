'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
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
import { RaiseYourVoice } from '@/components/raise-your-voice'
import { AllIdeasMatter } from '@/components/all-ideas-matter'
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
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

// Global variables to track newsletter loading state across renders and component instances
// We'll initialize it as false and check localStorage in the useEffect hook
const globalNewsletterLoaded = { 
  current: false
};

// Debounce mechanism to prevent rapid successive fetches
const lastFetchAttemptRef = { 
  current: 0
};
const MIN_FETCH_INTERVAL = 5000; // Minimum 5 seconds between fetch attempts

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
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [weather, setWeather] = useState({ temp: 25, condition: 'Loading...', location: 'Fetching...' })
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
  const [newsletter, setNewsletter] = useState<any>(null)
  const [newsletterError, setNewsletterError] = useState<string | null>(null)
  const [flightMetrics, setFlightMetrics] = useState<any>(null)

  // Format date range for display
  const getDateRangeText = () => {
    if (!flightMetrics?.dateRange?.actualDate) {
      return 'Loading...';
    }
    
    // Parse the actual date used (MM/DD/YYYY format)
    const [month, day, year] = flightMetrics.dateRange.actualDate.split('/').map(Number);
    const actualDate = new Date(year, month - 1, day);
    
    // Check if it's yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = actualDate.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday (${actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    } else {
      return actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  
  // Fetch flight metrics when component mounts
  useEffect(() => {
    fetch('/api/flight-data')
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.error || 'Failed to fetch flight data')
          })
        }
        return response.json()
      })
      .then(data => {
        if (data.success && data.metrics) {
          setFlightMetrics(data.metrics)
        }
      })
      .catch(error => {
        console.error('Error fetching flight data:', error)
      })
  }, [])


  // Function to reset newsletter loading state and force a fresh fetch
  // This clears the localStorage flag, resets the debounce timestamp,
  // clears any error state, and reloads the page with a force_fetch parameter to ensure a fresh fetch
  const resetNewsletterLoadingState = () => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      globalNewsletterLoaded.current = false
      lastFetchAttemptRef.current = 0 // Reset the debounce timestamp
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
    // Only set time on client side
    if (typeof window !== 'undefined') {
      // Set initial time
      setCurrentTime(new Date())
      // Update time every second
      const timer = setInterval(() => setCurrentTime(new Date()), 1000)
      return () => clearInterval(timer)
    }
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
                  }
                } else {
                  console.error('Weather API error:', response.status, response.statusText);
                }
              } catch (error) {
                console.error('Error fetching weather:', error);
              } finally {
                setWeatherLoading(false);
              }
            },
            async (error) => {
              // Geolocation failed, use fallback (Jeddah)
              console.log('Geolocation error:', error, 'using fallback location');
              
              try {
                const response = await fetch('/api/weather', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ latitude: 21.543333, longitude: 39.172778 }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.weatherData) {
                    setWeather({
                      temp: Math.round(data.weatherData.current.temp_c),
                      condition: data.weatherData.current.condition.text,
                      location: data.weatherData.location.name
                    });
                  }
                }
              } catch (error) {
                console.error('Error fetching fallback weather:', error);
                // Set default values if all fails
                setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
              } finally {
                setWeatherLoading(false);
              }
            },
            {
              timeout: 5000,
              maximumAge: 300000 // Cache location for 5 minutes
            }
          );
        } else {
          // Geolocation not available, use fallback
          setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
          setWeatherLoading(false);
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        setWeather({ temp: 25, condition: 'Clear', location: 'Jeddah' });
        setWeatherLoading(false);
      }
    };

    // Only fetch weather after component is mounted and user is authenticated
    console.log('Weather useEffect triggered. Session:', !!session);
    if (session && typeof window !== 'undefined') {
      fetchWeatherData();
    }
  }, [session])

  // Newsletter loading effect - only runs on client side
  useEffect(() => {
    console.log('[NEWSLETTER] useEffect triggered');
    
    // Skip this effect during server-side rendering
    if (typeof window === 'undefined') {
      console.log('[NEWSLETTER] Skipped - server-side rendering');
      return;
    }
    
    // Also skip if no session
    if (!session) {
      console.log('[NEWSLETTER] Skipped - no session');
      return;
    }
    
    console.log('[NEWSLETTER] Effect running with session:', session?.user?.email);

    // Newsletter logging
    const errorLog = (message, ...args) => {
      console.error(`[NEWSLETTER-ERROR] ${message}`, ...args);
    };

    // Function to fetch newsletter
    const fetchNewsletter = () => {
      // Implement debounce to prevent rapid successive fetches
      const now = Date.now();
      if (lastFetchAttemptRef.current > 0 && now - lastFetchAttemptRef.current < MIN_FETCH_INTERVAL) {
        console.log('[NEWSLETTER] Debounce protection - skipping fetch');
        return;
      }

      lastFetchAttemptRef.current = now;
      console.log('[NEWSLETTER] Starting fetch from API...');

      // Fetch the newsletter
      console.log('[NEWSLETTER] Fetching from /api/sharepoint/newsletter-list');
      fetch('/api/sharepoint/newsletter-list', {
        credentials: 'same-origin', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(response => {
          console.log('[NEWSLETTER] Response received:', response.status, response.statusText);

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

              // Save this fallback to localStorage to avoid repeated fetch attempts
              localStorage.setItem('newsletterLoaded', 'true');
              globalNewsletterLoaded.current = true;

              // Return early to avoid the error path
              return;
            } else {
              throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
          }
          return response.json();
        })
        .then(data => {
          console.log('[NEWSLETTER] Data received:', {
            success: data.success,
            hasNewsletter: !!data.newsletter,
            error: data.error || 'none'
          });

          if (data.success && data.newsletter) {
            console.log('[NEWSLETTER] Fetch successful:', {
              title: data.newsletter.title,
              contentLength: data.newsletter.content?.length || 0
            });

            setNewsletter(data.newsletter);

            // Save to localStorage to avoid refetching
            localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
            localStorage.setItem('newsletterLoaded', 'true');
            globalNewsletterLoaded.current = true;
            console.log('[NEWSLETTER] Data saved to localStorage');
          } else {
            errorLog('API returned success:false or missing newsletter data', {
              success: data.success,
              error: data.error || 'Unknown error',
              details: data.details || 'No details provided'
            });

            // If there's a newsletter object in the error response, log its details
            if (data.newsletter) {
              console.log('[NEWSLETTER] Error response included fallback content');
            }

            throw new Error(data.error || 'Unknown error fetching newsletter');
          }
        })
        .catch(error => {
          errorLog(`Newsletter fetch failed: ${error.message}`);

          // Check if it's a network error
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.log('[NEWSLETTER] Network error detected');

            // Provide a fallback for network errors too
            setNewsletter({
              title: "Newsletter Temporarily Unavailable",
              content: "<div style='text-align: center; padding: 20px;'><p>Unable to connect to the newsletter service.</p><p>This could be due to network connectivity issues.</p><p>Please check your connection and try again later.</p></div>",
              lastUpdated: typeof window !== 'undefined' ? new Date().toISOString() : 'unknown',
              source: "system"
            });

            // Save this fallback to localStorage to avoid repeated fetch attempts
            localStorage.setItem('newsletterLoaded', 'true');
            globalNewsletterLoaded.current = true;

            // Return early to avoid setting the error state
            return;
          }

          // For other errors, show a more user-friendly error message
          // but also provide a fallback newsletter content
          setNewsletter({
            title: "Newsletter Error",
            content: `<div style='text-align: center; padding: 20px;'>
              <p>We encountered an issue while loading the newsletter.</p>
              <p>Please try again later or contact IT support if the issue persists.</p>
              <p><small>Error details: ${error.message}</small></p>
            </div>`,
            lastUpdated: typeof window !== 'undefined' ? new Date().toISOString() : 'unknown',
            source: "system"
          });

          // Still set the error for debugging purposes
          setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);

          // Save this fallback to localStorage to avoid repeated fetch attempts
          localStorage.setItem('newsletterLoaded', 'true');
          globalNewsletterLoaded.current = true;
        });
    };

    // Check if newsletter has already been loaded in this session
    const newsletterLoaded = localStorage.getItem('newsletterLoaded') === 'true';
    globalNewsletterLoaded.current = newsletterLoaded;
    console.log('[NEWSLETTER] Loading state check:', newsletterLoaded ? 'Already loaded' : 'Not loaded yet');

    if (newsletterLoaded) {
      console.log('[NEWSLETTER] Already loaded in localStorage, checking for cached data...');

      // Try to get newsletter data from localStorage
      const storedNewsletter = localStorage.getItem('newsletterData');
      if (storedNewsletter) {
        try {
          const parsedNewsletter = JSON.parse(storedNewsletter);
          setNewsletter(parsedNewsletter);
          console.log('[NEWSLETTER] Loaded from localStorage:', {
            title: parsedNewsletter.title,
            contentLength: parsedNewsletter.content?.length || 0
          });
        } catch (error) {
          errorLog('Failed to parse newsletter data from localStorage', error);
          setNewsletterError('Error loading saved newsletter data. Please try refreshing the page.');
        }
      } else {
        console.log('[NEWSLETTER] No data found in localStorage despite loaded flag being set - clearing flag');
        // Clear the flag since we don't have the actual data
        localStorage.removeItem('newsletterLoaded');
        globalNewsletterLoaded.current = false;
        
        // Trigger a fetch since we don't have the data
        console.log('[NEWSLETTER] Triggering fetch due to missing data');
        fetchNewsletter();
      }

      return;
    }

    // Check URL parameters for force_fetch flag
    const forceFetch = new URLSearchParams(window.location.search).get('force_fetch') === 'true';
    const clearCache = new URLSearchParams(window.location.search).get('clear_cache') === 'true';
    
    if (clearCache) {
      console.log('Clear cache requested - removing newsletter data from localStorage');
      localStorage.removeItem('newsletterLoaded');
      localStorage.removeItem('newsletterData');
      globalNewsletterLoaded.current = false;
    }

    console.log('[NEWSLETTER] Force fetch:', forceFetch, 'Clear cache:', clearCache);

    // If newsletter hasn't been loaded or force_fetch is true, fetch it
    if (!globalNewsletterLoaded.current || forceFetch) {
      fetchNewsletter();
    } else {
      console.log('[NEWSLETTER] Already loaded in this session - skipping fetch');
    }
  }, [session]) // Session dependency to re-run when auth changes

  return (
    <div>
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
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-800 text-lg font-semibold">
                      {currentTime ? currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      }) : '--:--'}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {currentTime ? currentTime.toLocaleDateString('en-US', { 
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
                  <p className="text-gray-600 text-sm">On-Time Performance</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">{flightMetrics ? `${flightMetrics.onTimePerformance}%` : '...'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDateRangeText()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Flying Hours</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">{flightMetrics ? flightMetrics.flyingHours.toLocaleString() : '...'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDateRangeText()}</p>
                </div>
                <Clock className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Load Factor</p>
                  <p className="text-2xl font-bold text-flyadeal-bright-green">{flightMetrics ? `${flightMetrics.loadFactor}%` : '...'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDateRangeText()}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-flyadeal-bright-green/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Guests Carried</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">{flightMetrics ? `${flightMetrics.guestsCarried}K` : '...'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDateRangeText()}</p>
                </div>
                <Users className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Flights</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">{flightMetrics ? flightMetrics.totalFlights.toLocaleString() : '...'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDateRangeText()}</p>
                </div>
                <Plane className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* CEO Newsletter */}
              <GlassmorphismContainer className="p-4 sm:p-6 h-[calc(32rem+1.5rem)] sm:h-[calc(36rem+1.5rem)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                    <span className="hidden sm:inline">CEO Newsletter</span>
                    <span className="sm:hidden">Newsletter</span>
                  </h2>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="flex space-x-1 sm:space-x-2">
                      <Button
                        onClick={() => window.location.href = '/newsletter-archive'}
                        size="sm"
                        variant="outline"
                        className={`${theme === 'dark' 
                          ? "bg-gray-700/30 border-gray-400 text-gray-200 hover:bg-gray-600/50" 
                          : "bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                        } px-2 sm:px-3`}
                      >
                        <Newspaper className={`w-4 h-4 sm:mr-1 ${theme === 'dark' ? 'text-gray-200' : ''}`} />
                        <span className="hidden sm:inline">Archive</span>
                      </Button>
                      <Button
                        onClick={() => setNewsletterModalOpen(true)}
                        size="sm"
                        className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90 px-2 sm:px-3"
                      >
                        <Maximize2 className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">View Full</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Newsletter Content */}
                <div className="bg-white rounded-lg overflow-hidden h-[calc(100%-2.5rem)] w-full">
                  {newsletterError ? (
                    // Error state - show error message with retry button
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center p-6 max-w-md">
                        <X className="w-12 h-12 mx-auto mb-4 text-red-400" />
                        <p className="mb-2 text-red-500 font-medium">Error loading newsletter</p>

                        {/* Split error message and troubleshooting into separate elements */}
                        {newsletterError && (
                          <>
                            <div className="mb-4 text-sm text-gray-600 bg-gray-100 p-3 rounded-md text-left">
                              {newsletterError.split('\n\n').map((part, index) => (
                                <div key={index} className={index === 1 ? 'mt-3 pt-3 border-t border-gray-200' : ''}>
                                  {part}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        <div className="flex justify-center space-x-3">
                          <Button 
                            onClick={resetNewsletterLoadingState}
                            size="sm"
                            className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                          >
                            Retry
                          </Button>

                        </div>
                      </div>
                    </div>
                  ) : newsletter ? (
                    // Success state - show newsletter content with scrollable area
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      <div className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6 sm:pt-0 newsletter-content-wrapper" style={{ paddingTop: 0 }}>
                        <style jsx global>{`
                          .newsletter-content > *:first-child {
                            margin-top: 0 !important;
                            padding-top: 0 !important;
                          }
                          
                          /* Remove margins from nested first elements */
                          .newsletter-content > * > *:first-child {
                            margin-top: 0 !important;
                            padding-top: 0 !important;
                          }
                          
                          @media (max-width: 640px) {
                            /* Remove padding from wrapper on mobile */
                            .newsletter-content-wrapper {
                              padding-top: 0 !important;
                            }
                            
                            /* Reset to normal positioning */
                            .newsletter-content {
                              margin-top: 0 !important;
                              padding-top: 0 !important;
                            }
                            
                            /* Target all possible first elements with more specificity */
                            .newsletter-content > :first-child,
                            .newsletter-content > * > :first-child,
                            .newsletter-content p:first-of-type,
                            .newsletter-content div:first-of-type,
                            .newsletter-content table:first-of-type,
                            .newsletter-content *[style*="margin-top"],
                            .newsletter-content *[style*="padding-top"] {
                              margin-top: 0 !important;
                              padding-top: 0 !important;
                            }
                            
                            /* Hide empty paragraphs and divs at the start */
                            .newsletter-content > p:empty,
                            .newsletter-content > div:empty,
                            .newsletter-content > br:first-child,
                            .newsletter-content > p:first-child:empty,
                            .newsletter-content > div:first-child:empty {
                              display: none !important;
                            }
                            
                            .newsletter-content * {
                              max-width: 100% !important;
                            }
                            .newsletter-content img {
                              height: auto !important;
                            }
                            .newsletter-content table {
                              width: 100% !important;
                              table-layout: fixed !important;
                            }
                            .newsletter-content [style*="width"] {
                              width: 100% !important;
                              max-width: 100% !important;
                            }
                          }
                        `}</style>
                        <div 
                          className="newsletter-content"
                          ref={(el) => {
                            if (el && window.innerWidth <= 640) {
                              // Wait for content to render
                              setTimeout(() => {
                                // More aggressive empty element removal
                                let modified = true;
                                while (modified) {
                                  modified = false;
                                  const firstChild = el.firstElementChild as HTMLElement;
                                  
                                  if (firstChild) {
                                    const text = firstChild.textContent?.trim() || '';
                                    const isEmptyOrWhitespace = !text || text === '\u00A0' || text === '&nbsp;';
                                    const isOnlyBr = firstChild.tagName === 'BR';
                                    const hasOnlyEmptyChildren = firstChild.children.length > 0 && 
                                      Array.from(firstChild.children).every(child => 
                                        !(child as HTMLElement).textContent?.trim()
                                      );
                                    
                                    if (isEmptyOrWhitespace || isOnlyBr || hasOnlyEmptyChildren) {
                                      firstChild.remove();
                                      modified = true;
                                    } else {
                                      // Found real content, force remove all spacing
                                      firstChild.style.marginTop = '0';
                                      firstChild.style.paddingTop = '0';
                                      firstChild.style.marginBlockStart = '0';
                                      firstChild.style.paddingBlockStart = '0';
                                      
                                      // Also check first child of first child
                                      const nestedFirst = firstChild.firstElementChild as HTMLElement;
                                      if (nestedFirst) {
                                        nestedFirst.style.marginTop = '0';
                                        nestedFirst.style.paddingTop = '0';
                                        nestedFirst.style.marginBlockStart = '0';
                                        nestedFirst.style.paddingBlockStart = '0';
                                      }
                                    }
                                  }
                                }
                                
                                // Also force the wrapper to have no top padding
                                const wrapper = el.parentElement;
                                if (wrapper) {
                                  wrapper.style.paddingTop = '0';
                                }
                              }, 50);
                            }
                          }}
                          dangerouslySetInnerHTML={{ __html: newsletter.content }}
                          style={{ 
                            color: '#374151'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    // Loading state
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Loading newsletter...</p>
                      </div>
                    </div>
                  )}
                </div>
              </GlassmorphismContainer>


              {/* Company News */}
              <CompanyNews />

              {/* Feedback Components - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <RaiseYourVoice />
                <AllIdeasMatter />
              </div>

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

      {/* Newsletter Modal */}
      {newsletterModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-flyadeal-purple">
              <h3 className="text-xl font-bold text-gray-100">
                {newsletterError ? 'Newsletter Error' : newsletter?.title || 'CEO Newsletter'}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setNewsletterModalOpen(false)}
                  size="sm"
                  variant="ghost"
                  className="text-gray-100 hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {newsletterError ? (
                // Error state in modal
                <div className="flex flex-col items-center justify-center py-8">
                  <X className="w-16 h-16 mb-6 text-red-400" />
                  <h4 className="text-xl font-medium text-red-500 mb-4">Error loading newsletter</h4>

                  {/* Split error message and troubleshooting into separate elements */}
                  <div className="w-full max-w-lg mb-6 text-sm text-gray-600 bg-gray-100 p-4 rounded-md text-left">
                    {newsletterError.split('\n\n').map((part, index) => (
                      <div key={index} className={index === 1 ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                        {part}
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      onClick={resetNewsletterLoadingState}
                      size="default"
                      className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                    >
                      Retry
                    </Button>

                  </div>
                </div>
              ) : newsletter ? (
                // Success state - show newsletter content
                <>
                  <style jsx global>{`
                    .newsletter-modal-content {
                      width: 100%;
                      overflow-x: hidden;
                    }
                    
                    .newsletter-modal-content * {
                      max-width: 100% !important;
                      box-sizing: border-box !important;
                    }
                    
                    .newsletter-modal-content img {
                      height: auto !important;
                    }
                    
                    .newsletter-modal-content table {
                      width: 100% !important;
                      table-layout: fixed !important;
                    }
                    
                    .newsletter-modal-content [style*="width"] {
                      width: 100% !important;
                      max-width: 100% !important;
                    }
                    
                    @media (max-width: 640px) {
                      .newsletter-modal-content {
                        font-size: 14px;
                      }
                    }
                  `}</style>
                  <div 
                    className="newsletter-modal-content"
                    dangerouslySetInnerHTML={{ __html: newsletter.content }}
                    style={{
                      color: '#374151'
                    }}
                  />
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p><strong>Last updated:</strong> {new Date(newsletter.lastUpdated).toLocaleString()}</p>
                  </div>
                </>
              ) : (
                // Loading state in modal
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow mb-4"></div>
                  <p className="text-gray-500">Loading newsletter...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <ChatButton />
    </div>
  )
}

export default function PageContent() {
  const { theme } = useTheme()
  const { data: session, status } = useSession()

  // Determine which content to show based on auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated' && session) {
    return (
      <div className="min-h-screen">
        <DashboardPage />
      </div>
    )
  }

  // Show login page for unauthenticated users
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoginPage />
    </div>
  )
}