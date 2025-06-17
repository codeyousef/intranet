'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  Mail
} from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

// Sample flight operations data
const sampleFlightData = [
  { flight: 'F3-121', route: 'RUH-JED', status: 'On Time', delay: 0 },
  { flight: 'F3-122', route: 'JED-RUH', status: 'Departed', delay: 5 },
  { flight: 'F3-125', route: 'RUH-DMM', status: 'On Time', delay: 0 },
  { flight: 'F3-130', route: 'JED-CAI', status: 'Delayed', delay: 15 },
]

// Sample company offers
const companyOffers = [
  { company: 'Hertz', discount: '30%', category: 'Car Rental', expires: '2025-07-01' },
  { company: 'Marriott', discount: '15%', category: 'Hotels', expires: '2025-06-30' },
  { company: 'Enterprise', discount: '25%', category: 'Car Rental', expires: '2025-08-15' },
  { company: 'Hilton', discount: '20%', category: 'Hotels', expires: '2025-07-31' },
]

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
          <h1 className="text-3xl font-bold text-white mb-2 font-raleway">
            Welcome to Flyadeal Intranet
          </h1>
          <p className="text-white/70">
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Fetch newsletter content from SharePoint API
    const fetchNewsletter = async () => {
      if (session) {
        console.log('🎯 Fetching newsletter from SharePoint API...')
        try {
          const response = await fetch('/api/sharepoint/newsletter')
          const data = await response.json()
          
          if (data.success && data.newsletter) {
            console.log('✅ Newsletter fetched successfully from SharePoint')
            console.log('📄 Newsletter source:', data.newsletter.source)
            setNewsletter(data.newsletter)
          } else if (data.fallback && data.newsletter) {
            console.log('⚠️ Using fallback newsletter content - reason:', data.reason)
            console.log('📄 Fallback source:', data.newsletter.source)
            // This is fallback content, display it but show it's not from SharePoint
            setNewsletter(data.newsletter)
          } else {
            console.log('⚠️ No newsletter content available - API returned:', data)
            // Check if it's a token issue
            const isTokenIssue = data.note && data.note.includes('SharePoint access failed')
            
            setNewsletter({
              title: 'CEO Newsletter - June 2025',
              content: `
                <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px;">
                  <div style="background: linear-gradient(135deg, #522D6D, #D7D800); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 24px;">📄 CEO Newsletter</h2>
                    <p style="margin: 0; opacity: 0.9;">Monthly Update - June 2025</p>
                  </div>
                  
                  <p style="margin-bottom: 20px; color: #495057; font-size: 16px;">
                    ${isTokenIssue ? 
                      'SharePoint access temporarily unavailable.<br/>This may be due to expired permissions.' : 
                      'Unable to load newsletter from SharePoint.<br/>Click below to access it directly.'
                    }
                  </p>
                  
                  ${isTokenIssue ? `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>💡 Tip:</strong> Try signing out and signing back in to refresh your SharePoint permissions.
                      </p>
                    </div>
                  ` : ''}
                  
                  <div style="margin: 20px 0;">
                    <a 
                      href="https://flyadeal.sharepoint.com/sites/Thelounge/Shared%20Documents/CEO%20Newsletter/last-newsletter.html" 
                      target="_blank" 
                      style="display: inline-block; padding: 15px 30px; background: #522D6D; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;"
                    >
                      📖 Open Newsletter in SharePoint
                    </a>
                  </div>
                </div>
              `,
              sharePointUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge/Shared%20Documents/CEO%20Newsletter/last-newsletter.html',
              lastUpdated: new Date().toISOString(),
              source: isTokenIssue ? 'Fallback - Token Issue' : 'Fallback - API Failed'
            })
          }
        } catch (error) {
          console.error('❌ Failed to fetch newsletter:', error)
          // Set fallback content on error
          setNewsletter({
            title: 'CEO Newsletter - June 2025',
            content: `
              <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px;">
                <div style="background: linear-gradient(135deg, #522D6D, #D7D800); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 10px 0; font-size: 24px;">📄 CEO Newsletter</h2>
                  <p style="margin: 0; opacity: 0.9;">Monthly Update - June 2025</p>
                </div>
                
                <p style="margin-bottom: 20px; color: #495057; font-size: 16px;">
                  Newsletter temporarily unavailable.
                  <br/>Click below to access it directly in SharePoint.
                </p>
                
                <div style="margin: 20px 0;">
                  <a 
                    href="https://flyadeal.sharepoint.com/sites/Thelounge/Shared%20Documents/CEO%20Newsletter/last-newsletter.html" 
                    target="_blank" 
                    style="display: inline-block; padding: 15px 30px; background: #522D6D; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;"
                  >
                    📖 Open Newsletter in SharePoint
                  </a>
                </div>
              </div>
            `,
            sharePointUrl: 'https://flyadeal.sharepoint.com/sites/Thelounge/Shared%20Documents/CEO%20Newsletter/last-newsletter.html',
            lastUpdated: new Date().toISOString(),
            source: 'Error Fallback'
          })
        }
      }
    }

    fetchNewsletter()
  }, [session])

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
                  </h1>
                  <p className="text-white/70">
                    Here's what's happening at Flyadeal today
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-white/90 text-lg font-semibold">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                  <div className="text-white/70 text-sm">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Today's Flights</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">24</p>
                </div>
                <Plane className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">On Time Performance</p>
                  <p className="text-2xl font-bold text-green-400">89%</p>
                </div>
                <Clock className="w-8 h-8 text-green-400/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Weather</p>
                  <p className="text-2xl font-bold text-white">{weather.temp}°C</p>
                  <p className="text-xs text-white/70">{weather.condition}</p>
                </div>
                <Thermometer className="w-8 h-8 text-orange-400/60" />
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Active Offers</p>
                  <p className="text-2xl font-bold text-flyadeal-yellow">{companyOffers.length}</p>
                </div>
                <Gift className="w-8 h-8 text-flyadeal-yellow/60" />
              </div>
            </GlassmorphismContainer>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* CEO Newsletter */}
              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                    CEO Newsletter
                  </h2>
                  <div className="flex items-center space-x-2">
                    {newsletter?.sharePointUrl && (
                      <Button
                        onClick={() => window.open(newsletter.sharePointUrl, '_blank')}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        SharePoint
                      </Button>
                    )}
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
                
                {/* Newsletter Content */}
                <div className="bg-white rounded-lg overflow-hidden">
                  {newsletter ? (
                    <div>
                      <div className="h-96 overflow-y-auto p-6">
                        <div 
                          dangerouslySetInnerHTML={{ __html: newsletter.content }}
                          style={{ color: '#374151' }}
                        />
                      </div>
                      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between items-center">
                        <span>📁 {newsletter.source} • Updated: {new Date(newsletter.lastUpdated).toLocaleDateString()}</span>
                        <a 
                          href={newsletter.sharePointUrl}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open in SharePoint</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Loading newsletter...</p>
                      </div>
                    </div>
                  )}
                </div>
              </GlassmorphismContainer>

              {/* Flight Operations */}
              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                    Live Flight Operations
                  </h2>
                  <Link href="/powerbi-final">
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Full Dashboard
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {sampleFlightData.map((flight, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-flyadeal-yellow"></div>
                        <div>
                          <div className="text-white font-medium">{flight.flight}</div>
                          <div className="text-white/70 text-sm">{flight.route}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          flight.status === 'On Time' ? 'text-green-400' : 
                          flight.status === 'Delayed' ? 'text-red-400' : 'text-flyadeal-yellow'
                        }`}>
                          {flight.status}
                        </div>
                        {flight.delay > 0 && (
                          <div className="text-white/70 text-xs">+{flight.delay}m</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>

              {/* Company News */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Newspaper className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Company News
                </h2>
                <div className="space-y-3">
                  {companyNews.map((news, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="text-white font-medium">{news.title}</div>
                        <div className="text-white/70 text-sm">{news.date} • {news.category}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Company Offers */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Employee Offers
                </h2>
                <div className="space-y-3">
                  {companyOffers.map((offer, index) => (
                    <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">{offer.company}</div>
                        <div className="text-flyadeal-yellow font-bold">{offer.discount}</div>
                      </div>
                      <div className="text-white/70 text-sm">{offer.category}</div>
                      <div className="text-white/50 text-xs mt-1">Expires: {offer.expires}</div>
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>

              {/* Upcoming Events */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-white font-medium mb-1">{event.title}</div>
                      <div className="text-white/70 text-sm">{event.date} at {event.time}</div>
                      <div className="text-white/50 text-xs flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {event.location}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassmorphismContainer>

              {/* Birthdays & Anniversaries */}
              <GlassmorphismContainer className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-flyadeal-yellow" />
                  Celebrations
                </h2>
                
                {/* Birthdays */}
                <div className="mb-4">
                  <h3 className="text-white/90 font-medium mb-2 flex items-center">
                    <Cake className="w-4 h-4 mr-1 text-pink-400" />
                    Birthdays
                  </h3>
                  <div className="space-y-2">
                    {announcements.birthdays.map((birthday, index) => (
                      <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                        <div className="text-white">{birthday.name}</div>
                        <div className="text-white/70 text-xs">{birthday.department} • {birthday.date}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anniversaries */}
                <div>
                  <h3 className="text-white/90 font-medium mb-2 flex items-center">
                    <Award className="w-4 h-4 mr-1 text-flyadeal-yellow" />
                    Work Anniversaries
                  </h3>
                  <div className="space-y-2">
                    {announcements.anniversaries.map((anniversary, index) => (
                      <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                        <div className="text-white">{anniversary.name}</div>
                        <div className="text-white/70 text-xs">{anniversary.years} years • {anniversary.department} • {anniversary.date}</div>
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
      {newsletterModalOpen && newsletter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-flyadeal-purple">
              <h3 className="text-xl font-bold text-white">{newsletter.title}</h3>
              <div className="flex items-center space-x-2">
                {newsletter.sharePointUrl && (
                  <Button
                    onClick={() => window.open(newsletter.sharePointUrl, '_blank')}
                    size="sm"
                    variant="outline"
                    className="text-white border-white/30 hover:bg-white/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in SharePoint
                  </Button>
                )}
                <Button
                  onClick={() => setNewsletterModalOpen(false)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
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
            </div>
          </div>
        </div>
      )}
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