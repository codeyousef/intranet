'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Link, 
  Trash, 
  Plus, 
  Save, 
  UserPlus, 
  UserMinus, 
  AlertCircle,
  Loader2,
  Calendar,
  Newspaper,
  Users,
  Server,
  FileText,
  Download,
  MessageSquareWarning,
  Lightbulb,
  Crown
} from 'lucide-react'

import { ClientOnly } from '@/lib/client-only'

// Type definitions
interface PlatformLink {
  id: number
  title: string
  url: string
  icon: string
  display_order: number
  is_active: boolean
}

interface AdminUser {
  email: string
  created_at: string
}

interface Event {
  id: number
  title: string
  description?: string
  event_date: string
  created_at: string
}

interface NewsItem {
  id: number
  title: string
  content?: string
  published_at: string
  created_at: string
}

interface Complaint {
  id: number
  content: string
  category?: string
  status: string
  created_at: string
  resolved_at?: string
  admin_notes?: string
}

interface Suggestion {
  id: number
  content: string
  category?: string
  status: string
  user_name?: string
  user_email?: string
  created_at: string
  resolved_at?: string
  admin_notes?: string
}

export default function AdminPage() {
  // For server-side rendering, we'll render a simple loading state
  // Then use ClientOnly to render the actual content on the client side only
  // This completely avoids hydration mismatches by not rendering anything complex during SSR
  return (
    <div className="min-h-screen">
      {/* Client-only content - only rendered after hydration */}
      <ClientOnly
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-flyadeal-yellow" />
              <p className="mt-2 text-gray-600">Loading admin panel...</p>
            </div>
          </div>
        }
      >
        <AdminPageContent />
      </ClientOnly>
    </div>
  );
}

// The actual content component with all the logic - only rendered on client
function AdminPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [isPeopleAdmin, setIsPeopleAdmin] = useState(false)
  const [isAuditAdmin, setIsAuditAdmin] = useState(false)
  const [isCEOAdmin, setIsCEOAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [peopleAdminUsers, setPeopleAdminUsers] = useState<AdminUser[]>([])
  const [auditAdminUsers, setAuditAdminUsers] = useState<AdminUser[]>([])
  const [ceoAdminUsers, setCEOAdminUsers] = useState<AdminUser[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [companyNews, setCompanyNews] = useState<NewsItem[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [ceoQuestions, setCEOQuestions] = useState<any[]>([])

  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    icon: 'Link',
    display_order: 0,
    is_active: true
  })

  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newPeopleAdminEmail, setNewPeopleAdminEmail] = useState('')
  const [newAuditAdminEmail, setNewAuditAdminEmail] = useState('')
  const [newCEOAdminEmail, setNewCEOAdminEmail] = useState('')

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: ''
  })

  const [newNewsItem, setNewNewsItem] = useState({
    title: '',
    content: '',
    published_at: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Available icons for platform links
  const availableIcons = [
    'Link', 'Mail', 'FileText', 'Calendar', 'Users', 'Settings', 
    'BarChart', 'Book', 'Briefcase', 'Cloud', 'Code', 'Database',
    'FileSearch', 'Globe', 'HardDrive', 'Home', 'Image', 'Inbox',
    'MessageSquare', 'Phone', 'PieChart', 'Search', 'Server', 'ShoppingCart',
    'Star', 'Tool', 'Video', 'Zap'
  ]

  // Set mounted to true on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is admin and people admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        console.log('Checking admin status, session:', session);
        const adminResponse = await fetch('/api/admin/check')
        const adminData = await adminResponse.json()
        console.log('Admin check response:', adminData);

        if (!adminData.authenticated) {
          console.log('User not authenticated, redirecting to homepage');
          router.push('/')
          return
        }

        setIsAdmin(adminData.isAdmin)
        console.log('Setting isAdmin to:', adminData.isAdmin);

        // Also check if user is a people admin
        const peopleAdminResponse = await fetch('/api/people-admin/check')
        const peopleAdminData = await peopleAdminResponse.json()
        console.log('People admin check response:', peopleAdminData);

        setIsPeopleAdmin(peopleAdminData.isPeopleAdmin)
        console.log('Setting isPeopleAdmin to:', peopleAdminData.isPeopleAdmin);

        // Also check if user is an audit admin
        const auditAdminResponse = await fetch('/api/audit-admin/check')
        const auditAdminData = await auditAdminResponse.json()
        console.log('Audit admin check response:', auditAdminData);
        
        setIsAuditAdmin(auditAdminData.isAuditAdmin)
        console.log('Setting isAuditAdmin to:', auditAdminData.isAuditAdmin);

        // Also check if user is a CEO admin
        const ceoAdminResponse = await fetch('/api/ceo-admin/check')
        const ceoAdminData = await ceoAdminResponse.json()
        console.log('CEO admin check response:', ceoAdminData);
        
        setIsCEOAdmin(ceoAdminData.isCEOAdmin)
        console.log('Setting isCEOAdmin to:', ceoAdminData.isCEOAdmin);

        if (!adminData.isAdmin) {
          console.log('User not admin, redirecting to homepage');
          router.push('/')
        } else {
          console.log('User is admin, loading data');
          // Load platform links and admin users
          fetchPlatformLinks()
          fetchAdminUsers()

          // If user is a people admin or regular admin, load people admin data
          if (adminData.isAdmin) {
            fetchPeopleAdminUsers()
            fetchAuditAdminUsers()
            fetchCEOAdminUsers()
          }

          // If user is a people admin, load events and company news
          if (peopleAdminData.isPeopleAdmin) {
            fetchEvents()
            fetchCompanyNews()
          }
          
          // If user is an audit admin or regular admin, load complaints and suggestions
          if (auditAdminData.isAuditAdmin || adminData.isAdmin) {
            fetchComplaints()
            fetchSuggestions()
          }

          // If user is a CEO admin or regular admin, load CEO questions
          if (ceoAdminData.isCEOAdmin || adminData.isAdmin) {
            fetchCEOQuestions()
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setError('Failed to verify admin status')
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      console.log('User authenticated, checking admin status');
      checkAdminStatus()
    } else if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to homepage');
      setIsLoading(false)
      router.push('/')
    } else {
      console.log('Auth status:', status);
      // If status is still loading, keep isLoading true
    }
  }, [status, router, session])

  // Fetch platform links
  const fetchPlatformLinks = async () => {
    try {
      const response = await fetch('/api/platform-links')
      const data = await response.json()
      // Ensure data is an array before setting state
      setPlatformLinks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching platform links:', error)
      setError('Failed to fetch platform links')
      // Set empty array on error
      setPlatformLinks([])
    }
  }

  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      // Ensure data is an array before setting state
      setAdminUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching admin users:', error)
      setError('Failed to fetch admin users')
      // Set empty array on error
      setAdminUsers([])
    }
  }

  // Fetch people admin users
  const fetchPeopleAdminUsers = async () => {
    try {
      const response = await fetch('/api/people-admin/users')
      const data = await response.json()
      // Ensure data is an array before setting state
      setPeopleAdminUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching people admin users:', error)
      setError('Failed to fetch people admin users')
      // Set empty array on error
      setPeopleAdminUsers([])
    }
  }

  // Fetch audit admin users
  const fetchAuditAdminUsers = async () => {
    try {
      const response = await fetch('/api/audit-admin/users')
      const data = await response.json()
      // Ensure data is an array before setting state
      setAuditAdminUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching audit admin users:', error)
      setError('Failed to fetch audit admin users')
      // Set empty array on error
      setAuditAdminUsers([])
    }
  }

  // Fetch CEO admin users
  const fetchCEOAdminUsers = async () => {
    try {
      const response = await fetch('/api/ceo-admin/users')
      const data = await response.json()
      // Ensure data is an array before setting state
      setCEOAdminUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching CEO admin users:', error)
      setError('Failed to fetch CEO admin users')
      // Set empty array on error
      setCEOAdminUsers([])
    }
  }

  // Fetch CEO questions
  const fetchCEOQuestions = async () => {
    try {
      const response = await fetch('/api/ceo-questions')
      const data = await response.json()
      // Ensure data.questions is an array before setting state
      setCEOQuestions(Array.isArray(data.questions) ? data.questions : [])
    } catch (error) {
      console.error('Error fetching CEO questions:', error)
      setError('Failed to fetch CEO questions')
      // Set empty array on error
      setCEOQuestions([])
    }
  }

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      // Ensure data is an array before setting state
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Failed to fetch events')
      // Set empty array on error
      setEvents([])
    }
  }

  // Fetch company news
  const fetchCompanyNews = async () => {
    try {
      const response = await fetch('/api/company-news')
      const data = await response.json()
      // Ensure data is an array before setting state
      setCompanyNews(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching company news:', error)
      setError('Failed to fetch company news')
      // Set empty array on error
      setCompanyNews([])
    }
  }

  // Add new platform link
  const addPlatformLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/platform-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLink)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add platform link')
      }

      // Reset form and refresh links
      setNewLink({
        title: '',
        url: '',
        icon: 'Link',
        display_order: 0,
        is_active: true
      })

      fetchPlatformLinks()
      setSuccess('Platform link added successfully')
    } catch (error) {
      console.error('Error adding platform link:', error)
      setError(error instanceof Error ? error.message : 'Failed to add platform link')
    }
  }

  // Delete platform link
  const deletePlatformLink = async (id: number) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/platform-links/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete platform link')
      }

      fetchPlatformLinks()
      setSuccess('Platform link deleted successfully')
    } catch (error) {
      console.error('Error deleting platform link:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete platform link')
    }
  }

  // Add new admin user
  const addAdminUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newAdminEmail) {
      setError('Email is required')
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newAdminEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add admin user')
      }

      // Reset form and refresh admin users
      setNewAdminEmail('')
      fetchAdminUsers()
      setSuccess('Admin user added successfully')
    } catch (error) {
      console.error('Error adding admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to add admin user')
    }
  }

  // Remove admin user
  const removeAdminUser = async (email: string) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove admin user')
      }

      fetchAdminUsers()
      setSuccess('Admin user removed successfully')
    } catch (error) {
      console.error('Error removing admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove admin user')
    }
  }

  // Add new people admin user
  const addPeopleAdminUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPeopleAdminEmail) {
      setError('Email is required')
      return
    }

    try {
      const response = await fetch('/api/people-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newPeopleAdminEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add people admin user')
      }

      // Reset form and refresh people admin users
      setNewPeopleAdminEmail('')
      fetchPeopleAdminUsers()
      setSuccess('People admin user added successfully')
    } catch (error) {
      console.error('Error adding people admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to add people admin user')
    }
  }

  // Remove people admin user
  const removePeopleAdminUser = async (email: string) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/people-admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove people admin user')
      }

      fetchPeopleAdminUsers()
      setSuccess('People admin user removed successfully')
    } catch (error) {
      console.error('Error removing people admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove people admin user')
    }
  }

  // Add new audit admin user
  const addAuditAdminUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newAuditAdminEmail) {
      setError('Email is required')
      return
    }

    try {
      const response = await fetch('/api/audit-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newAuditAdminEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add audit admin user')
      }

      // Reset form and refresh audit admin users
      setNewAuditAdminEmail('')
      fetchAuditAdminUsers()
      setSuccess('Audit admin user added successfully')
    } catch (error) {
      console.error('Error adding audit admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to add audit admin user')
    }
  }

  // Remove audit admin user
  const removeAuditAdminUser = async (email: string) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/audit-admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove audit admin user')
      }

      fetchAuditAdminUsers()
      setSuccess('Audit admin user removed successfully')
    } catch (error) {
      console.error('Error removing audit admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove audit admin user')
    }
  }

  // Add new CEO admin user
  const addCEOAdminUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newCEOAdminEmail) {
      setError('Email is required')
      return
    }

    try {
      const response = await fetch('/api/ceo-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newCEOAdminEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add CEO admin user')
      }

      // Reset form and refresh CEO admin users
      setNewCEOAdminEmail('')
      fetchCEOAdminUsers()
      setSuccess('CEO admin user added successfully')
    } catch (error) {
      console.error('Error adding CEO admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to add CEO admin user')
    }
  }

  // Remove CEO admin user
  const removeCEOAdminUser = async (email: string) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/ceo-admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove CEO admin user')
      }

      fetchCEOAdminUsers()
      setSuccess('CEO admin user removed successfully')
    } catch (error) {
      console.error('Error removing CEO admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove CEO admin user')
    }
  }

  // Add new event
  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newEvent.title) {
      setError('Event title is required')
      return
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add event')
      }

      // Reset form and refresh events
      setNewEvent({
        title: '',
        description: '',
        event_date: ''
      })
      fetchEvents()
      setSuccess('Event added successfully')
    } catch (error) {
      console.error('Error adding event:', error)
      setError(error instanceof Error ? error.message : 'Failed to add event')
    }
  }

  // Delete event
  const deleteEvent = async (id: number) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }

      fetchEvents()
      setSuccess('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }

  // Add new company news item
  const addCompanyNews = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newNewsItem.title) {
      setError('News title is required')
      return
    }

    try {
      const response = await fetch('/api/company-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNewsItem)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add news item')
      }

      // Reset form and refresh company news
      setNewNewsItem({
        title: '',
        content: '',
        published_at: ''
      })
      fetchCompanyNews()
      setSuccess('News item added successfully')
    } catch (error) {
      console.error('Error adding news item:', error)
      setError(error instanceof Error ? error.message : 'Failed to add news item')
    }
  }

  // Delete company news item
  const deleteCompanyNews = async (id: number) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/company-news/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete news item')
      }

      fetchCompanyNews()
      setSuccess('News item deleted successfully')
    } catch (error) {
      console.error('Error deleting news item:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete news item')
    }
  }

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      const response = await fetch('/api/complaints')
      const data = await response.json()
      // Ensure data.complaints is an array before setting state
      setComplaints(Array.isArray(data.complaints) ? data.complaints : [])
    } catch (error) {
      console.error('Error fetching complaints:', error)
      setError('Failed to fetch complaints')
      // Set empty array on error
      setComplaints([])
    }
  }

  // Fetch suggestions
  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/suggestions')
      const data = await response.json()
      // Ensure data.suggestions is an array before setting state
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setError('Failed to fetch suggestions')
      // Set empty array on error
      setSuggestions([])
    }
  }

  // Update complaint status
  const updateComplaintStatus = async (id: number, status: string) => {
    try {
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update complaint')
      }

      fetchComplaints()
      setSuccess('Complaint status updated successfully')
    } catch (error) {
      console.error('Error updating complaint:', error)
      setError(error instanceof Error ? error.message : 'Failed to update complaint')
    }
  }

  // Update suggestion status
  const updateSuggestionStatus = async (id: number, status: string) => {
    try {
      const response = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update suggestion')
      }

      fetchSuggestions()
      setSuccess('Suggestion status updated successfully')
    } catch (error) {
      console.error('Error updating suggestion:', error)
      setError(error instanceof Error ? error.message : 'Failed to update suggestion')
    }
  }

  // Update CEO question status
  const updateCEOQuestionStatus = async (id: number, status: string, admin_response?: string) => {
    try {
      const response = await fetch('/api/ceo-questions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, status, admin_response })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update CEO question')
      }

      fetchCEOQuestions()
      setSuccess('CEO question updated successfully')
    } catch (error) {
      console.error('Error updating CEO question:', error)
      setError(error instanceof Error ? error.message : 'Failed to update CEO question')
    }
  }

  // For server-side rendering, we need to ensure the initial state matches what will be rendered
  // We'll use a combination of CSS classes and client-side JS to handle the transitions
  // This approach avoids hydration mismatches by ensuring server and client render the same initial HTML

  // Determine visibility states based on component state and mounted status
  const showLoading = isLoading || !mounted || status === 'loading'
  const showAdmin = mounted && isAdmin && !isLoading && status === 'authenticated'

  return (
    <div className="min-h-screen">
      {/* Loading state - always rendered but visibility controlled by CSS */}
      <div 
        className="min-h-screen flex items-center justify-center" 
        style={{display: showLoading ? "flex" : "none"}}
      >
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-flyadeal-yellow" />
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>

      {/* Admin panel - always rendered but visibility controlled by CSS */}
      <div style={{display: showAdmin ? "block" : "none"}}>
        <Navigation />

        <main className="pt-28 p-6">
          <div className="max-w-7xl mx-auto">
            <GlassmorphismContainer className="p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Panel</h1>
              <p className="text-gray-600">
                Manage platform links, admin users, events, and company news
              </p>
            </GlassmorphismContainer>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                {success}
              </div>
            )}

            <Tabs defaultValue="platform-links">
              <TabsList className="mb-6">
                <TabsTrigger value="platform-links">Platform Links</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="admin-groups">Admin Groups</TabsTrigger>
                )}
                {isPeopleAdmin && (
                  <>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="company-news">Company News</TabsTrigger>
                  </>
                )}
                {(isAuditAdmin || isAdmin) && (
                  <>
                    <TabsTrigger value="complaints">Complaints</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                  </>
                )}
                {(isCEOAdmin || isAdmin) && (
                  <TabsTrigger value="ceo-questions">CEO Questions</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="platform-links">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new platform link */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Platform Link</CardTitle>
                      <CardDescription>
                        Create a new link to be displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={addPlatformLink} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input 
                            id="title" 
                            value={newLink.title} 
                            onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                            placeholder="e.g. SharePoint"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="url">URL</Label>
                          <Input 
                            id="url" 
                            value={newLink.url} 
                            onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                            placeholder="e.g. https://flyadeal.sharepoint.com"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="icon">Icon</Label>
                          <Select 
                            value={newLink.icon} 
                            onValueChange={(value) => setNewLink({...newLink, icon: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an icon" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableIcons.map((icon) => (
                                <SelectItem key={icon} value={icon}>
                                  {icon}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="display_order">Display Order</Label>
                          <Input 
                            id="display_order" 
                            type="number" 
                            value={newLink.display_order} 
                            onChange={(e) => setNewLink({...newLink, display_order: parseInt(e.target.value)})}
                            min="0"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="is_active" 
                            checked={newLink.is_active} 
                            onCheckedChange={(checked) => setNewLink({...newLink, is_active: checked})}
                          />
                          <Label htmlFor="is_active">Active</Label>
                        </div>

                        <Button type="submit" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Link
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing platform links */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Existing Platform Links</CardTitle>
                      <CardDescription>
                        Manage existing links displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {platformLinks.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No platform links found</p>
                      ) : (
                        <div className="space-y-4">
                          {platformLinks.map((link) => (
                            <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{link.title}</p>
                                <p className="text-sm text-gray-500">{link.url}</p>
                                <div className="flex items-center mt-1">
                                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded mr-2">
                                    Icon: {link.icon}
                                  </span>
                                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded mr-2">
                                    Order: {link.display_order}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${link.is_active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {link.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deletePlatformLink(link.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="admin-groups">
                <div className="space-y-8">
                  {/* Admin Users Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-500" />
                        Admin Users
                      </CardTitle>
                      <CardDescription>
                        Manage users with full administrative access
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Add new admin user */}
                        <Card>
                          <CardContent className="pt-6">
                            <form onSubmit={addAdminUser} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="admin-email">Email</Label>
                                <Input 
                                  id="admin-email" 
                                  value={newAdminEmail} 
                                  onChange={(e) => setNewAdminEmail(e.target.value)}
                                  placeholder="e.g. user@flyadeal.com"
                                  type="email"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Admin
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Existing admin users */}
                        <Card className="md:col-span-2">
                          <CardContent className="pt-6">
                            {adminUsers.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No admin users found</p>
                            ) : (
                              <div className="space-y-4">
                                {adminUsers.map((user) => (
                                  <div key={user.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{user.email}</p>
                                      <p className="text-xs text-gray-500">Added: {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => removeAdminUser(user.email)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  {/* People Admin Users Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-500" />
                        People Admin Users
                      </CardTitle>
                      <CardDescription>
                        Manage users with people admin access for events and company news
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Add new people admin user */}
                        <Card>
                          <CardContent className="pt-6">
                            <form onSubmit={addPeopleAdminUser} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="people-admin-email">Email</Label>
                                <Input 
                                  id="people-admin-email" 
                                  value={newPeopleAdminEmail} 
                                  onChange={(e) => setNewPeopleAdminEmail(e.target.value)}
                                  placeholder="e.g. user@flyadeal.com"
                                  type="email"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add People Admin
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Existing people admin users */}
                        <Card className="md:col-span-2">
                          <CardContent className="pt-6">
                            {peopleAdminUsers.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No people admin users found</p>
                            ) : (
                              <div className="space-y-4">
                                {peopleAdminUsers.map((user) => (
                                  <div key={user.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{user.email}</p>
                                      <p className="text-xs text-gray-500">Added: {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => removePeopleAdminUser(user.email)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audit Admin Users Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquareWarning className="h-5 w-5 mr-2 text-red-500" />
                        Audit Admin Users
                      </CardTitle>
                      <CardDescription>
                        Manage users with access to anonymous complaints and suggestions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Add new audit admin user */}
                        <Card>
                          <CardContent className="pt-6">
                            <form onSubmit={addAuditAdminUser} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="audit-admin-email">Email</Label>
                                <Input 
                                  id="audit-admin-email" 
                                  value={newAuditAdminEmail} 
                                  onChange={(e) => setNewAuditAdminEmail(e.target.value)}
                                  placeholder="e.g. user@flyadeal.com"
                                  type="email"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Audit Admin
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Existing audit admin users */}
                        <Card className="md:col-span-2">
                          <CardContent className="pt-6">
                            {auditAdminUsers.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No audit admin users found</p>
                            ) : (
                              <div className="space-y-4">
                                {auditAdminUsers.map((user) => (
                                  <div key={user.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{user.email}</p>
                                      <p className="text-xs text-gray-500">Added: {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => removeAuditAdminUser(user.email)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CEO Admin Users Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Crown className="h-5 w-5 mr-2 text-flyadeal-yellow" />
                        CEO Admin Users
                      </CardTitle>
                      <CardDescription>
                        Manage users with access to CEO questions and responses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Add new CEO admin user */}
                        <Card>
                          <CardContent className="pt-6">
                            <form onSubmit={addCEOAdminUser} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="ceo-admin-email">Email</Label>
                                <Input 
                                  id="ceo-admin-email" 
                                  value={newCEOAdminEmail} 
                                  onChange={(e) => setNewCEOAdminEmail(e.target.value)}
                                  placeholder="e.g. user@flyadeal.com"
                                  type="email"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add CEO Admin
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Existing CEO admin users */}
                        <Card className="md:col-span-2">
                          <CardContent className="pt-6">
                            {ceoAdminUsers.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No CEO admin users found</p>
                            ) : (
                              <div className="space-y-4">
                                {ceoAdminUsers.map((user) => (
                                  <div key={user.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{user.email}</p>
                                      <p className="text-xs text-gray-500">Added: {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => removeCEOAdminUser(user.email)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>


              <TabsContent value="events">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new event */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Event</CardTitle>
                      <CardDescription>
                        Create a new event to be displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={addEvent} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="event-title">Title</Label>
                          <Input 
                            id="event-title" 
                            value={newEvent.title} 
                            onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                            placeholder="e.g. Company Meeting"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="event-description">Description</Label>
                          <Textarea 
                            id="event-description" 
                            value={newEvent.description} 
                            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                            placeholder="Event details..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="event-date">Event Date</Label>
                          <Input 
                            id="event-date" 
                            type="date" 
                            value={newEvent.event_date} 
                            onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          Add Event
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing events */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Existing Events</CardTitle>
                      <CardDescription>
                        Manage events displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {events.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No events found</p>
                      ) : (
                        <div className="space-y-4">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-gray-500">{event.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Date: {new Date(event.event_date).toLocaleDateString()}
                                </p>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deleteEvent(event.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="company-news">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new company news */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add Company News</CardTitle>
                      <CardDescription>
                        Create a new news item to be displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={addCompanyNews} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="news-title">Title</Label>
                          <Input 
                            id="news-title" 
                            value={newNewsItem.title} 
                            onChange={(e) => setNewNewsItem({...newNewsItem, title: e.target.value})}
                            placeholder="e.g. New Office Opening"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="news-content">Content</Label>
                          <Textarea 
                            id="news-content" 
                            value={newNewsItem.content} 
                            onChange={(e) => setNewNewsItem({...newNewsItem, content: e.target.value})}
                            placeholder="News content..."
                            rows={5}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="news-date">Publish Date</Label>
                          <Input 
                            id="news-date" 
                            type="date" 
                            value={newNewsItem.published_at} 
                            onChange={(e) => setNewNewsItem({...newNewsItem, published_at: e.target.value})}
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full">
                          <Newspaper className="h-4 w-4 mr-2" />
                          Add News
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing company news */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Existing News</CardTitle>
                      <CardDescription>
                        Manage news items displayed on the homepage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {companyNews.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No news items found</p>
                      ) : (
                        <div className="space-y-4">
                          {companyNews.map((news) => (
                            <div key={news.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{news.title}</p>
                                <p className="text-sm text-gray-500">{news.content && news.content.length > 100 ? `${news.content.substring(0, 100)}...` : news.content || ''}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Published: {new Date(news.published_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deleteCompanyNews(news.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="complaints">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquareWarning className="h-5 w-5 mr-2 text-red-500" />
                      Anonymous Complaints
                    </CardTitle>
                    <CardDescription>
                      Review and manage anonymous complaints submitted by employees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {complaints.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No complaints found</p>
                    ) : (
                      <div className="space-y-4">
                        {complaints.map((complaint) => (
                          <div key={complaint.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {complaint.category && (
                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                                      {complaint.category.replace('_', ' ')}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    complaint.status === 'new' ? 'bg-red-100 text-red-800' : 
                                    complaint.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {complaint.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{complaint.content}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Submitted: {new Date(complaint.created_at).toLocaleString()}
                                </p>
                                {complaint.resolved_at && (
                                  <p className="text-xs text-gray-500">
                                    Resolved: {new Date(complaint.resolved_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={complaint.status}
                                onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                              >
                                <SelectTrigger className="w-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {complaint.admin_notes && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-gray-600 mb-1">Admin Notes:</p>
                                <p className="text-sm text-gray-700">{complaint.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suggestions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                      Employee Suggestions
                    </CardTitle>
                    <CardDescription>
                      Review and manage suggestions submitted by employees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {suggestions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No suggestions found</p>
                    ) : (
                      <div className="space-y-4">
                        {suggestions.map((suggestion) => (
                          <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    {suggestion.user_name || suggestion.user_email}
                                  </span>
                                  {suggestion.category && (
                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                                      {suggestion.category.replace('_', ' ')}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    suggestion.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                    suggestion.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' : 
                                    suggestion.status === 'implemented' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {suggestion.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{suggestion.content}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Submitted: {new Date(suggestion.created_at).toLocaleString()}
                                </p>
                                {suggestion.resolved_at && (
                                  <p className="text-xs text-gray-500">
                                    Resolved: {new Date(suggestion.resolved_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={suggestion.status}
                                onValueChange={(value) => updateSuggestionStatus(suggestion.id, value)}
                              >
                                <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="implemented">Implemented</SelectItem>
                                  <SelectItem value="declined">Declined</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {suggestion.admin_notes && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-gray-600 mb-1">Admin Notes:</p>
                                <p className="text-sm text-gray-700">{suggestion.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ceo-questions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-flyadeal-yellow" />
                      CEO Questions
                    </CardTitle>
                    <CardDescription>
                      Review and respond to questions submitted to the CEO
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ceoQuestions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No CEO questions found</p>
                    ) : (
                      <div className="space-y-4">
                        {ceoQuestions.map((question) => (
                          <div key={question.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {question.is_anonymous ? (
                                    <span className="text-sm font-medium text-gray-500">Anonymous</span>
                                  ) : (
                                    <span className="text-sm font-medium text-gray-700">
                                      {question.user_name || question.user_email}
                                    </span>
                                  )}
                                  {question.category && (
                                    <span className="text-xs bg-flyadeal-yellow/20 text-flyadeal-purple px-2 py-1 rounded capitalize">
                                      {question.category.replace('_', ' ')}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    question.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                    question.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' : 
                                    question.status === 'answered' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {question.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap mb-3">{question.content}</p>
                                {question.admin_response && (
                                  <div className="bg-flyadeal-yellow/10 p-3 rounded-lg">
                                    <p className="text-xs font-medium text-flyadeal-purple mb-1">CEO Response:</p>
                                    <p className="text-sm text-gray-700">{question.admin_response}</p>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Submitted: {new Date(question.created_at).toLocaleString()}
                                </p>
                                {question.answered_at && (
                                  <p className="text-xs text-gray-500">
                                    Answered: {new Date(question.answered_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={question.status}
                                onValueChange={(value) => updateCEOQuestionStatus(question.id, value)}
                              >
                                <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="answered">Answered</SelectItem>
                                  <SelectItem value="dismissed">Dismissed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Admin Response Form */}
                            {(question.status === 'under_review' || question.status === 'answered') && (
                              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <Label htmlFor={`response-${question.id}`} className="text-sm font-medium">
                                  CEO Response:
                                </Label>
                                <Textarea
                                  id={`response-${question.id}`}
                                  placeholder="Enter CEO response here..."
                                  defaultValue={question.admin_response || ''}
                                  className="mt-1"
                                  onBlur={(e) => {
                                    if (e.target.value !== question.admin_response) {
                                      updateCEOQuestionStatus(question.id, question.status, e.target.value);
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
