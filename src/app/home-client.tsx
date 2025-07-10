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
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState(null)
  const [weather] = useState({ temp: 32, condition: 'Sunny', location: 'Riyadh' })
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

  // Newsletter loading effect - only runs on client side
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (typeof window === 'undefined') {
      return;
    }

    // Create enhanced logging functions - all info logs removed as requested
    const debugLog = (message, ...args) => {
      // No-op function - debug logs removed
    };

    // Critical logs removed as requested
    const criticalLog = (message, ...args) => {
      // No-op function - critical logs removed
    };

    // Info logs removed as requested
    const infoLog = (message, ...args) => {
      // No-op function - info logs removed
    };

    // Error logs are always shown
    const errorLog = (message, ...args) => {
      console.error(`[NEWSLETTER-ERROR] ${message}`, ...args);
    };

    // Check if newsletter has already been loaded in this session
    const newsletterLoaded = localStorage.getItem('newsletterLoaded') === 'true';
    globalNewsletterLoaded.current = newsletterLoaded;
    infoLog(`Newsletter loading state check: ${newsletterLoaded ? 'Already loaded' : 'Not loaded yet'}`);

    if (newsletterLoaded) {
      debugLog('🔍 Newsletter already loaded in this session, checking localStorage for data');
      infoLog('Attempting to load newsletter from localStorage');

      // Try to get newsletter data from localStorage
      const storedNewsletter = localStorage.getItem('newsletterData');
      if (storedNewsletter) {
        try {
          const parsedNewsletter = JSON.parse(storedNewsletter);
          setNewsletter(parsedNewsletter);
          debugLog('✅ Loaded newsletter data from localStorage', parsedNewsletter);
          infoLog('Successfully loaded newsletter from localStorage', {
            title: parsedNewsletter.title,
            contentLength: parsedNewsletter.content?.length || 0,
            lastUpdated: parsedNewsletter.lastUpdated,
            source: parsedNewsletter.source
          });
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

    // Check URL parameters for force_fetch flag
    const forceFetch = new URLSearchParams(window.location.search).get('force_fetch') === 'true';

    infoLog(`Force fetch parameter check: ${forceFetch ? 'Force fetch requested' : 'Normal fetch flow'}`);

    // If newsletter hasn't been loaded or force_fetch is true, fetch it
    if (!globalNewsletterLoaded.current || forceFetch) {
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
      infoLog('Environment information', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        windowDimensions: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        endpoint: '/api/sharepoint/newsletter-list'
      });

      // Fetch the newsletter
      fetch('/api/sharepoint/newsletter-list')
        .then(response => {
          criticalLog(`Newsletter API response received - Status: ${response.status} ${response.statusText}`);
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
          infoLog('Newsletter API response data', {
            success: data.success,
            hasNewsletter: !!data.newsletter,
            error: data.error || 'none',
            details: data.details || 'none'
          });

          if (data.success && data.newsletter) {
            debugLog('✅ Newsletter fetched successfully', data.newsletter);
            criticalLog(`Newsletter fetch successful - Content length: ${data.newsletter.content?.length || 0} characters`);
            infoLog('Newsletter metadata', {
              title: data.newsletter.title,
              lastUpdated: data.newsletter.lastUpdated,
              source: data.newsletter.source,
              type: data.newsletter.type,
              sharePointUrl: data.newsletter.sharePointUrl || 'none'
            });

            setNewsletter(data.newsletter);

            // Save to localStorage to avoid refetching
            localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
            localStorage.setItem('newsletterLoaded', 'true');
            globalNewsletterLoaded.current = true;
            infoLog('Newsletter data saved to localStorage');
          } else {
            errorLog('API returned success:false or missing newsletter data', {
              success: data.success,
              error: data.error || 'Unknown error',
              details: data.details || 'No details provided'
            });

            // If there's a newsletter object in the error response, log its details
            if (data.newsletter) {
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
          debugLog('❌ Error fetching newsletter', error);
          errorLog(`Newsletter fetch failed: ${error.message}`, {
            stack: error.stack,
            timestamp: new Date().toISOString()
          });

          // Check if it's a network error
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            criticalLog('Network error detected - possible connectivity issue or CORS problem');

            // Provide a fallback for network errors too
            setNewsletter({
              title: "Newsletter Temporarily Unavailable",
              content: "<div style='text-align: center; padding: 20px;'><p>Unable to connect to the newsletter service.</p><p>This could be due to network connectivity issues.</p><p>Please check your connection and try again later.</p></div>",
              lastUpdated: new Date().toISOString(),
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
            lastUpdated: new Date().toISOString(),
            source: "system"
          });

          // Still set the error for debugging purposes
          setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);

          // Save this fallback to localStorage to avoid repeated fetch attempts
          localStorage.setItem('newsletterLoaded', 'true');
          globalNewsletterLoaded.current = true;
        });
    } else {
      debugLog('🔍 Newsletter already loaded in this session, skipping fetch');
      infoLog('Newsletter fetch skipped - already loaded in this session');
    }
  }, [session, isClient]) // Add isClient as a dependency to ensure this only runs on the client

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
                      <div className="text-gray-800 font-semibold">{weather.temp}°C</div>
                      <div className="text-gray-600 text-xs">{weather.condition}, {weather.location}</div>
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
  const { data: session, status, error } = useSession()
  const [mounted, setMounted] = useState(false)

  // Set mounted to true on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle NextAuth errors
  useEffect(() => {
    if (error) {
      console.error('NextAuth session error:', error)
    }
  }, [error])

  // Determine which content to show, but don't conditionally render different components
  // This ensures the same DOM structure on both server and client for initial render
  const isLoading = status === 'loading' || !mounted
  const isAuthenticated = mounted && status === 'authenticated' && !!session
  const showLogin = mounted && (status === 'unauthenticated' || !!error || !session)

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