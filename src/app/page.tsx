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

    // Newsletter fetching code has been commented out since the newsletter component is not being used
    // This prevents unnecessary API requests to /api/sharepoint/newsletter-iframe

    debugLog('🔄 Newsletter fetching has been disabled since the component is not in use');

    // Return empty cleanup function
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
