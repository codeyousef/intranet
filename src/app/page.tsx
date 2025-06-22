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

// Sample company news
const companyNews = [
  { title: 'New Route Announcement: RUH-MXP', date: '2025-06-10', category: 'Operations' },
  { title: 'Q2 2025 Financial Results Released', date: '2025-06-08', category: 'Business' },
  { title: 'Safety Excellence Award Received', date: '2025-06-05', category: 'Achievement' },
  { title: 'Fleet Expansion: 3 New A321neo Aircraft', date: '2025-06-03', category: 'Operations' },
]

// Sample upcoming events
const upcomingEvents = [
  { title: 'All Hands Meeting', date: '2025-06-20', time: '10:00 AM', location: 'Main Auditorium' },
  { title: 'Safety Training Session', date: '2025-06-22', time: '2:00 PM', location: 'Training Center' },
  { title: 'Team Building Event', date: '2025-06-25', time: '6:00 PM', location: 'Al Faisaliah Hotel' },
]

// Sample birthdays and anniversaries
const announcements = {
  birthdays: [
    { name: 'Ahmed Al-Rashid', department: 'Operations', date: 'Today' },
    { name: 'Sarah Johnson', department: 'Customer Service', date: 'Tomorrow' },
    { name: 'Mohammed Al-Khaled', department: 'Maintenance', date: 'June 18' },
  ],
  anniversaries: [
    { name: 'Fatima Al-Zahra', years: 5, department: 'Finance', date: 'This Week' },
    { name: 'Ali Hassan', years: 10, department: 'Pilot', date: 'Next Week' },
  ]
}

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
    // Create a debug logger function
    const debugLog = (message, ...args) => {
      if (process.env.NODE_ENV === 'development' && 
          typeof window !== 'undefined' && 
          localStorage.getItem('debug') === 'true') {
        console.log(message, ...args);
      }
    };

    // Check for force_fetch parameter in URL
    const forceFetch = typeof window !== 'undefined' && 
      new URLSearchParams(window.location.search).get('force_fetch') === 'true'

    debugLog('🔄 Newsletter fetch initialization - component mounted')

    if (forceFetch) {
      debugLog('🔄 Force fetch parameter detected in URL, ignoring localStorage state')
      globalNewsletterLoaded.current = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('newsletterLoaded')
        debugLog('🔄 Cleared localStorage newsletter flag due to force_fetch parameter')
      }
    } 
    // Check localStorage for newsletter loaded state when component mounts
    else if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('newsletterLoaded') === 'true'
      debugLog('🔍 Checking localStorage for newsletter state:', savedState ? 'LOADED' : 'NOT LOADED')

      // Always set globalNewsletterLoaded to false to ensure we fetch the newsletter
      // This fixes the issue where the component gets stuck in loading state
      globalNewsletterLoaded.current = false
      debugLog('🔍 Ignoring saved state and setting globalNewsletterLoaded.current to false to force fetch')

      // If localStorage has the flag set but we don't have a newsletter, clear it
      if (savedState && !newsletter) {
        localStorage.removeItem('newsletterLoaded')
        debugLog('🔍 Cleared localStorage newsletter flag because newsletter is not loaded')
      }
    }

    // Fetch newsletter content from SharePoint API
    const fetchNewsletter = async () => {
      debugLog('🔍 Newsletter fetch check - global loaded state:', globalNewsletterLoaded.current)
      debugLog('🔍 Session status:', session ? 'Available' : 'Not available')

      // Check if we're trying to fetch too frequently
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchAttempt.timestamp
      debugLog('⏱️ Time since last fetch attempt:', timeSinceLastFetch, 'ms')

      if (timeSinceLastFetch < lastFetchAttempt.minInterval) {
        debugLog('⏳ Throttling fetch request - too soon since last attempt')
        return
      }

      // Update the last fetch attempt timestamp
      lastFetchAttempt.timestamp = now

      // Only fetch if we have a session and haven't already loaded the newsletter globally
      if (session && !globalNewsletterLoaded.current) {
        debugLog('✅ Conditions met for fetching newsletter: session available and not already loaded')

        // Don't set the global flag to true yet - we'll do that after the fetch succeeds
        // This ensures we can retry if the fetch fails
        debugLog('🔒 Will set globalNewsletterLoaded.current to true after successful fetch')

        debugLog('🎯 Fetching newsletter from SharePoint API...')
        try {
          // Use the iframe endpoint to embed the SharePoint document
          debugLog('🔍 Making fetch request to /api/sharepoint/newsletter-iframe')
          const response = await fetch('/api/sharepoint/newsletter-iframe')
          debugLog('🔍 Fetch response received:', response.status, response.statusText)

          // Parse the JSON response regardless of status code
          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            // Handle JSON parsing errors (e.g., malformed JSON, empty response)
            debugLog('❌ JSON parsing error:', jsonError instanceof Error ? jsonError.message : 'Unknown JSON error');

            // Try to get the raw text to see what was returned
            try {
              // We need to clone the response since we already tried to parse it as JSON
              const clonedResponse = response.clone();
              const rawText = await clonedResponse.text();
              debugLog('📄 Raw response text (first 100 chars):', rawText.substring(0, 100));

              // Create a fallback data object with the error information
              data = {
                success: false,
                error: 'Invalid JSON response from API',
                newsletter: {
                  title: 'Error: Could not load newsletter',
                  content: `<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border-radius: 5px;">
                    <h3>Error loading newsletter content</h3>
                    <p>The server returned a response that could not be processed.</p>
                    <p><strong>Error details:</strong> ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON parsing error'}</p>
                    <p><strong>Troubleshooting:</strong> Please try again later or contact support if the issue persists.</p>
                  </div>`,
                  sharePointUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html',
                  lastUpdated: new Date().toISOString(),
                  source: 'Error Fallback Content',
                  type: 'html',
                  isErrorFallback: true
                }
              };

              // Continue with this fallback data instead of throwing an error
              debugLog('📄 Created fallback data object for invalid JSON response');
            } catch (textError) {
              // If we can't even get the text, create a generic fallback data object
              debugLog('❌ Failed to get raw response text:', textError);

              // Create a generic fallback data object with minimal information
              data = {
                success: false,
                error: 'Failed to parse API response',
                newsletter: {
                  title: 'Error: Could not load newsletter',
                  content: `<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border-radius: 5px;">
                    <h3>Error loading newsletter content</h3>
                    <p>The server returned a response that could not be processed.</p>
                    <p><strong>Error details:</strong> Unable to parse response as JSON or extract raw text.</p>
                    <p><strong>Technical details:</strong> ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON parsing error'}</p>
                    <p><strong>Troubleshooting:</strong> Please try again later or contact support if the issue persists.</p>
                  </div>`,
                  sharePointUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html',
                  lastUpdated: new Date().toISOString(),
                  source: 'Error Fallback Content (Generic)',
                  type: 'html',
                  isErrorFallback: true
                }
              };

              debugLog('📄 Created generic fallback data object for unreadable response');
            }
          }

          // Check if we have fallback data from a JSON parsing error
          const isJsonParsingFallback = data && data.newsletter && data.newsletter.isErrorFallback === true;

          // Check if the response was not successful (unless we're already using fallback data)
          if (!response.ok && !isJsonParsingFallback) {
            debugLog('⚠️ API returned non-success status:', response.status, response.statusText)

            // Check if the response contains fallback newsletter content despite the error
            if (data.newsletter && data.newsletter.content) {
              debugLog('📄 API returned fallback newsletter content despite error')
              debugLog('📄 Using fallback newsletter content from error response')
              // Continue processing with the fallback content
            } else {
              // No usable content in the error response, throw an error
              throw new Error(`API returned status: ${response.status} ${response.statusText}`)
            }
          }

          // If we have fallback data from a JSON parsing error, log it
          if (isJsonParsingFallback) {
            debugLog('📄 Using fallback data from JSON parsing error')
          }

          // Only log the response data if it's not too large (to avoid console flooding)
          try {
            const dataString = JSON.stringify(data, null, 2);
            if (dataString.length < 10000) {
              debugLog('🔍 Response data:', dataString);
            } else {
              debugLog('🔍 Response data: [Large response - length:', dataString.length, 'bytes]');
            }
          } catch (logError) {
            debugLog('⚠️ Could not stringify response data for logging:', logError);
          }

          // Process the newsletter data whether it's a successful response or fallback content
          if (data.newsletter && data.newsletter.content) {
            // Check if this is fallback content (either from a non-OK response or from JSON parsing error)
            if (!response.ok || isJsonParsingFallback || data.newsletter.isErrorFallback === true) {
              // This is fallback content from an error response or JSON parsing error
              debugLog('⚠️ Using fallback newsletter content due to API error or JSON parsing error')

              // If the newsletter already has isErrorFallback set (from JSON parsing), use it as is
              let newsletterWithWarning;

              if (data.newsletter.isErrorFallback === true) {
                debugLog('📊 Newsletter already has error fallback flag set');
                newsletterWithWarning = data.newsletter;
              } else {
                // If there's error information in the response, set a warning flag on the newsletter
                newsletterWithWarning = {
                  ...data.newsletter,
                  isErrorFallback: true,
                  errorType: data.errorType || 'UNKNOWN_ERROR',
                  errorDetails: data.details || 'Unknown error',
                  troubleshooting: data.troubleshooting || 'Please try again later.'
                };
              }

              setNewsletter(newsletterWithWarning)
              debugLog('📊 Fallback newsletter content set with warning flag')

              // Also set a less severe error message to indicate fallback content is being shown
              const troubleshootingMsg = data.troubleshooting || newsletterWithWarning.troubleshooting || '';
              setNewsletterError(`Note: Showing fallback content due to an error. ${troubleshootingMsg}`);
            } else {
              // This is a successful response
              debugLog('✅ Newsletter fetched successfully from SharePoint')
              debugLog('📄 Newsletter source:', data.newsletter.source)
              debugLog('📄 Newsletter type:', data.newsletter.type)
              debugLog('📄 Setting newsletter state with data')
              debugLog('📊 Setting newsletter state with data:', {
                title: data.newsletter.title,
                contentLength: data.newsletter.content.length,
                type: data.newsletter.type,
                source: data.newsletter.source
              })
              setNewsletter(data.newsletter)
              debugLog('📊 Newsletter state set successfully')
            }

            // Now that we've successfully fetched and set the newsletter, set the global flag to true
            globalNewsletterLoaded.current = true
            debugLog('🔒 Set globalNewsletterLoaded.current to true after successful fetch')

            // Also save to localStorage to persist across page refreshes
            if (typeof window !== 'undefined') {
              localStorage.setItem('newsletterLoaded', 'true')
              debugLog('🔒 Saved newsletter loaded state to localStorage')
            }
          } else {
            // If the API returns a non-success response, throw an error
            debugLog('⚠️ API returned non-success response:', data)
            throw new Error(data.error || 'Failed to fetch newsletter content')
          }
        } catch (error) {
          // Always log errors to console, but with conditional detailed logging
          console.error('❌ Failed to fetch newsletter:', error)
          debugLog('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')

          // Reset the global flag to allow retrying the fetch
          globalNewsletterLoaded.current = false
          if (typeof window !== 'undefined') {
            localStorage.removeItem('newsletterLoaded')
            debugLog('🔄 Reset newsletter loading state due to error')
          }

          // Set the error state to display to the user
          let errorMessage = '';
          let troubleshooting = '';

          // Check if the error has a response property (fetch error)
          if (error instanceof Error) {
            // Extract any additional information from the error message
            const authProblem = error.message.includes('401') || 
                               error.message.includes('403') || 
                               error.message.includes('token') || 
                               error.message.includes('auth');

            const networkProblem = error.message.includes('network') || 
                                  error.message.includes('timeout') || 
                                  error.message.includes('fetch failed');

            // Set appropriate error message and troubleshooting based on error type
            errorMessage = error.message;

            if (authProblem) {
              debugLog('❌ API error type: AUTH_ERROR');
              troubleshooting = 'Try signing out and signing back in to refresh your authentication token.';
            } else if (networkProblem) {
              debugLog('❌ API error type: NETWORK_ERROR');
              troubleshooting = 'Check your network connection and try again.';
            } else {
              debugLog('❌ API error type: UNKNOWN_ERROR');
              troubleshooting = 'Please try again later or contact support if the issue persists.';
            }
          } else {
            errorMessage = 'Failed to fetch newsletter';
            troubleshooting = 'Please try again later.';
          }

          // Set the error message with troubleshooting info
          setNewsletterError(`${errorMessage}${troubleshooting ? `\n\n${troubleshooting}` : ''}`);
          debugLog('❌ Final error message:', errorMessage);
        }
      } else {
        // Newsletter already loaded or no session
        if (!session) {
          debugLog('⏳ Not fetching newsletter: No session available')
        } else if (globalNewsletterLoaded.current) {
          debugLog('🔄 Not fetching newsletter: Already loaded (globalNewsletterLoaded.current is true)')
          debugLog('💡 To force a refresh, use the reset button or add ?force_fetch=true to the URL')
        }
      }
    }

    // Only run the fetch if we have a session
    if (session) {
      debugLog('🔄 Attempting to fetch newsletter (if not already loaded)...')
      fetchNewsletter()

      // We no longer need a fallback timer since we want to show the actual content or nothing
      // Instead, we'll retry the fetch if it fails
      debugLog('⏰ No fallback timer needed - we want to show the actual content or retry on failure')
    } else {
      debugLog('⏳ Waiting for session before fetching newsletter...')
    }

    // Empty dependency array means this effect runs once when component mounts
    // This is intentional - we only want to fetch the newsletter once per session
    // To force a refresh, use the reset button or add ?force_fetch=true to the URL

    // Reset the global flag when the component unmounts
    // This ensures that if the component remounts, it will try to fetch the newsletter again
    return () => {
      debugLog('🧹 Component unmounting - resetting globalNewsletterLoaded flag')
      globalNewsletterLoaded.current = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('newsletterLoaded')
      }
    };
  }, [session, renderState.hasNewsletter]) // Include session and newsletter state in dependencies to ensure effect runs when they change

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
              {/* CEO Newsletter - Temporarily commented out while debugging Viva Engage */}
              {false && (
                <GlassmorphismContainer className="p-6 h-[calc(36rem+1.5rem)]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                      CEO Newsletter
                    </h2>
                    <div className="flex items-center space-x-2">
                      {newsletter?.sharePointUrl && (
                        <Button
                          onClick={() => window.open(newsletter.sharePointUrl, '_blank')}
                          size="sm"
                          variant="outline"
                          className="bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          SharePoint
                        </Button>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => window.location.href = '/newsletter-archive'}
                          size="sm"
                          variant="outline"
                          className="bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          <Newspaper className="w-4 h-4 mr-1" />
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

                            {/* Add a button to open in SharePoint directly */}
                            <Button
                              onClick={() => window.open('https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html', '_blank')}
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              Open in SharePoint
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
              <GlassmorphismContainer className="p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Newspaper className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Company News
                </h2>
                <div className="space-y-3">
                  {companyNews.map((news, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="text-gray-800 font-medium">{news.title}</div>
                        <div className="text-gray-600 text-sm">{news.date} • {news.category}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>

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
                    className="bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in Viva Engage
                  </Button>
                </div>
                <VivaEngage />
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
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-gray-800 font-medium mb-1">{event.title}</div>
                      <div className="text-gray-600 text-sm">{event.date} at {event.time}</div>
                      <div className="text-gray-500 text-xs flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {event.location}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>

              {/* Birthdays & Anniversaries */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Celebrations
                </h2>

                {/* Birthdays */}
                <div className="mb-4">
                  <h3 className="text-gray-700 font-medium mb-2 flex items-center">
                    <Cake className="w-4 h-4 mr-1 text-pink-400" />
                    Birthdays
                  </h3>
                  <div className="space-y-2">
                    {announcements.birthdays.map((birthday, index) => (
                      <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                        <div className="text-gray-800">{birthday.name}</div>
                        <div className="text-gray-600 text-xs">{birthday.department} • {birthday.date}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anniversaries */}
                <div>
                  <h3 className="text-gray-700 font-medium mb-2 flex items-center">
                    <Award className="w-4 h-4 mr-1 text-flyadeal-yellow" />
                    Work Anniversaries
                  </h3>
                  <div className="space-y-2">
                    {announcements.anniversaries.map((anniversary, index) => (
                      <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                        <div className="text-gray-800">{anniversary.name}</div>
                        <div className="text-gray-600 text-xs">{anniversary.years} years • {anniversary.department} • {anniversary.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
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
                {!newsletterError && newsletter?.sharePointUrl && (
                  <Button
                    onClick={() => window.open(newsletter.sharePointUrl, '_blank')}
                    size="sm"
                    variant="outline"
                    className="text-gray-100 border-white/30 hover:bg-white/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in SharePoint
                  </Button>
                )}
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

                    <Button
                      onClick={() => window.open('https://flyadeal.sharepoint.com/sites/Thelounge/CEO%20Newsletter/last-newsletter.html', '_blank')}
                      size="default"
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      Open in SharePoint
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
                    {newsletter.sharePointUrl && (
                      <p><strong>Source:</strong> SharePoint - The Lounge</p>
                    )}
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
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return <DashboardPage />
}
