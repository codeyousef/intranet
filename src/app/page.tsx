'use client'

/**
 * Newsletter Fetching Implementation:
 * 
 * The newsletter is fetched once per session and the state is stored in localStorage.
 * This prevents repeated fetching of the same content across page refreshes.
 * 
 * To force a fresh fetch of the newsletter:
 * 1. Use the reset button (visible in development mode)
 * 2. Add ?force_fetch=true to the URL
 * 3. Clear localStorage manually
 * 
 * Debugging:
 * - To enable detailed debug logging, run this in the browser console:
 *   localStorage.setItem('debug', 'true'); window.location.reload();
 * - To disable debug logging:
 *   localStorage.removeItem('debug'); window.location.reload();
 * - When enabled, look for logs starting with 🔍, 🔄, ✅, 🔒, etc.
 */

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
import { VivaEngage } from '@/components/viva-engage'
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


// Mazaya offers are now loaded from the database via the MazayaOffers component

// Events and company news are now loaded from the database via their respective components

// Celebrations data will be fetched from the API

function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <p className="text-red-400 text-sm">
                {error === 'OAuthCallback' ? 'Authentication error. Please try again.' : 
                 error === 'Signin' ? 'Sign in failed. Please try again.' :
                 `Error: ${error}`}
              </p>
            </div>
          )}
        </div>

        <Button 
          onClick={() => signIn('azure-ad')}
          className="w-full bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90 font-semibold"
        >
          Sign in with Microsoft
        </Button>
      </GlassmorphismContainer>
    </div>
  )
}

function DashboardPage() {
  const { theme } = useTheme()
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather] = useState({ temp: 32, condition: 'Sunny', location: 'Riyadh' })
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
  const [newsletter, setNewsletter] = useState<any>(null)
  const [newsletterError, setNewsletterError] = useState<string | null>(null)

  // Log component render state for debugging (only in development)
  const renderState = {
    hasSession: !!session,
    hasNewsletter: !!newsletter,
    hasNewsletterError: !!newsletterError,
    newsletterModalOpen
  };
  if (process.env.NODE_ENV === 'development' && localStorage.getItem('debug') === 'true') {
    console.log('🔄 DashboardPage rendering with:', renderState)
  }

  // Function to reset newsletter loading state and force a fresh fetch
  // This clears the localStorage flag, resets the debounce timestamp,
  // clears any error state, and reloads the page with a force_fetch parameter to ensure a fresh fetch
  const resetNewsletterLoadingState = () => {
    globalNewsletterLoaded.current = false
    lastFetchAttempt.timestamp = 0 // Reset the debounce timestamp
    setNewsletterError(null) // Clear any error state
    if (typeof window !== 'undefined') {
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // We'll use the global ref instead of a component-level ref
  // This ensures the state persists even if the component remounts

  // We no longer need a fallback timer ref since we're not using fallback content

  useEffect(() => {
    // Create enhanced logging functions
    const debugLog = (message, ...args) => {
      // Always log to console in development mode if debug is true
      if (process.env.NODE_ENV === 'development' && 
          typeof window !== 'undefined' && 
          localStorage.getItem('debug') === 'true') {
        console.log(message, ...args);
      }
    };

    // Critical logs are always shown regardless of debug setting
    const criticalLog = (message, ...args) => {
      console.log(`[NEWSLETTER-CRITICAL] ${message}`, ...args);
    };

    // Info logs are shown in both development and production
    const infoLog = (message, ...args) => {
      console.log(`[NEWSLETTER-INFO] ${message}`, ...args);
    };

    // Error logs are always shown
    const errorLog = (message, ...args) => {
      console.error(`[NEWSLETTER-ERROR] ${message}`, ...args);
    };

    // Check if newsletter has already been loaded in this session
    if (typeof window !== 'undefined') {
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

        return () => {};
      }
    }

    // Check URL parameters for force_fetch flag
    const forceFetch = typeof window !== 'undefined' && 
      new URLSearchParams(window.location.search).get('force_fetch') === 'true';

    infoLog(`Force fetch parameter check: ${forceFetch ? 'Force fetch requested' : 'Normal fetch flow'}`);

    // If newsletter hasn't been loaded or force_fetch is true, fetch it
    if (!globalNewsletterLoaded.current || forceFetch) {
      // Implement debounce to prevent rapid successive fetches
      const now = Date.now();
      if (now - lastFetchAttempt.timestamp < lastFetchAttempt.minInterval) {
        debugLog('🔒 Fetch attempt too soon after previous attempt, skipping');
        infoLog(`Debounce protection triggered - last attempt was ${now - lastFetchAttempt.timestamp}ms ago (minimum interval: ${lastFetchAttempt.minInterval}ms)`);
        return () => {};
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
        endpoint: '/api/sharepoint/newsletter-iframe'
      });

      // Fetch the newsletter
      fetch('/api/sharepoint/newsletter-iframe')
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
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
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
            if (typeof window !== 'undefined') {
              localStorage.setItem('newsletterData', JSON.stringify(data.newsletter));
              localStorage.setItem('newsletterLoaded', 'true');
              globalNewsletterLoaded.current = true;
              infoLog('Newsletter data saved to localStorage');
            }
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
          }

          setNewsletterError(`Failed to load the newsletter. ${error.message}\n\nPlease try again later or contact IT support if the issue persists.`);
        });
    } else {
      debugLog('🔍 Newsletter already loaded in this session, skipping fetch');
      infoLog('Newsletter fetch skipped - already loaded in this session');
    }

    // Return cleanup function
    return () => {};
  }, [session]) // Keep session as a dependency to avoid lint warnings

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
                    Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
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
                      {currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
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
              {/* CEO Newsletter */}
              {true && (
                <GlassmorphismContainer className="p-6 h-[calc(36rem+1.5rem)]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                      CEO Newsletter
                    </h2>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => window.location.href = '/newsletter-archive'}
                          size="sm"
                          variant="outline"
                          className={theme === 'dark' 
                            ? "bg-gray-700/30 border-gray-400 text-gray-200 hover:bg-gray-600/50" 
                            : "bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          <Newspaper className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-gray-200' : ''}`} />
                          Archive
                        </Button>
                        <Button
                          onClick={() => setNewsletterModalOpen(true)}
                          size="sm"
                          className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                        >
                          <Maximize2 className="w-4 h-4 mr-1" />
                          View Full
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Newsletter Content */}
                  <div className="bg-white rounded-lg overflow-hidden h-[calc(100%-2.5rem)]">
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
                      <div className="h-full overflow-y-auto">
                        <div className="p-6">
                          <div 
                            dangerouslySetInnerHTML={{ __html: newsletter.content }}
                            style={{ color: '#374151' }}
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
              )}


              {/* Company News */}
              <CompanyNews />

              {/* Viva Engage */}
              <GlassmorphismContainer className="p-6 mt-6 h-[calc(24rem+1.5rem)]">
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
              </GlassmorphismContainer>
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
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: newsletter.content }}
                    style={{
                      color: '#374151',
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

export default function HomePage() {
  const { theme } = useTheme()
  const { data: session, status, error } = useSession()

  // Handle NextAuth errors
  useEffect(() => {
    if (error) {
      console.error('NextAuth session error:', error)
    }
  }, [error])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
      </div>
    )
  }

  // If there's an error but we still have a session, we can try to continue
  if (error && !session) {
    return (
      <LoginPage />
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <DashboardPage />
}
