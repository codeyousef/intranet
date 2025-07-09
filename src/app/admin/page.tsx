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
  Download
} from 'lucide-react'

import { ClientOnly } from '@/lib/client-only'

export default function AdminPage() {
  // For server-side rendering, we'll render a simple loading state
  // Then use ClientOnly to render the actual content on the client side only
  // This completely avoids hydration mismatches by not rendering anything complex during SSR
  return (
    <div className="min-h-screen">
      {/* Server-side and initial client render just shows a loading spinner */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-flyadeal-yellow" />
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>

      {/* Client-only content - only rendered after hydration */}
      <ClientOnly>
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
  const [isLoading, setIsLoading] = useState(true)

  const [platformLinks, setPlatformLinks] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [peopleAdminUsers, setPeopleAdminUsers] = useState([])
  const [events, setEvents] = useState([])
  const [companyNews, setCompanyNews] = useState([])

  // FTP state variables
  const [ftpConnected, setFtpConnected] = useState(false)
  const [ftpConnectionTesting, setFtpConnectionTesting] = useState(false)
  const [ftpCurrentDirectory, setFtpCurrentDirectory] = useState('')
  const [ftpFileList, setFtpFileList] = useState([])
  const [ftpSelectedFile, setFtpSelectedFile] = useState(null)
  const [ftpFileContent, setFtpFileContent] = useState('')
  const [ftpLoading, setFtpLoading] = useState(false)
  const [ftpDirectoryHistory, setFtpDirectoryHistory] = useState([''])
  const [ftpErrorDetails, setFtpErrorDetails] = useState(null)
  const [ftpTroubleshootingTips, setFtpTroubleshootingTips] = useState([])

  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    icon: 'Link',
    display_order: 0,
    is_active: true
  })

  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newPeopleAdminEmail, setNewPeopleAdminEmail] = useState('')

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
          }

          // If user is a people admin, load events and company news
          if (peopleAdminData.isPeopleAdmin) {
            fetchEvents()
            fetchCompanyNews()
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
      router.push('/')
    } else {
      console.log('Auth status:', status);
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
  const addPlatformLink = async (e) => {
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
      setError(error.message || 'Failed to add platform link')
    }
  }

  // Delete platform link
  const deletePlatformLink = async (id) => {
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
      setError(error.message || 'Failed to delete platform link')
    }
  }

  // Add new admin user
  const addAdminUser = async (e) => {
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
      setError(error.message || 'Failed to add admin user')
    }
  }

  // Remove admin user
  const removeAdminUser = async (email) => {
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
      setError(error.message || 'Failed to remove admin user')
    }
  }

  // Add new people admin user
  const addPeopleAdminUser = async (e) => {
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
      setError(error.message || 'Failed to add people admin user')
    }
  }

  // Remove people admin user
  const removePeopleAdminUser = async (email) => {
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
      setError(error.message || 'Failed to remove people admin user')
    }
  }

  // Add new event
  const addEvent = async (e) => {
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
      setError(error.message || 'Failed to add event')
    }
  }

  // Delete event
  const deleteEvent = async (id) => {
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
      setError(error.message || 'Failed to delete event')
    }
  }

  // Add new company news item
  const addCompanyNews = async (e) => {
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
      setError(error.message || 'Failed to add news item')
    }
  }

  // Delete company news item
  const deleteCompanyNews = async (id) => {
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
      setError(error.message || 'Failed to delete news item')
    }
  }

  // SharePoint Functions

  // Test SharePoint connection
  const testFtpConnection = async () => {
    setError('')
    setSuccess('')
    setFtpConnectionTesting(true)
    setFtpErrorDetails(null)
    setFtpTroubleshootingTips([])

    try {
      console.log('Starting SharePoint connection test...');
      const response = await fetch('/api/sharepoint?action=test')
      console.log('SharePoint test API response status:', response.status);

      const data = await response.json()

      // Log the entire response data for debugging
      console.log('SharePoint test response data:', data);
      console.log('SharePoint test response data.details:', data.details);
      console.log('SharePoint test response data.troubleshooting:', data.troubleshooting);

      if (!data.success) {
        console.error('SharePoint test failed with error:', data.error);
        throw new Error(data.error || 'Failed to test SharePoint connection')
      }

      setFtpConnected(data.connected)

      if (data.connected) {
        setSuccess('Successfully connected to SharePoint')
        // If connected, fetch the root directory
        fetchFtpFiles('')
      } else {
        // Format detailed error message
        let errorMessage = 'Could not connect to SharePoint';

        if (data.error) {
          errorMessage += `: ${data.error}`;
        }

        // Add retry attempts information if available
        if (data.retryAttempts !== undefined) {
          errorMessage += ` (Retry attempts: ${data.retryAttempts})`;
        }

        // Create default error details if missing
        const errorDetails = data.details || {
          'Error Code': 'UNKNOWN',
          'Message': data.error || 'Unknown error',
          'Type': 'Error',
          'Connection Information': {
            'Timestamp': new Date().toLocaleString()
          }
        };

        // Store and log detailed error information for debugging
        console.error('SharePoint connection error details:', errorDetails);

        // Make a deep copy of the details to ensure we don't lose any information
        try {
          const detailsCopy = JSON.parse(JSON.stringify(errorDetails));
          console.log('Parsed error details:', detailsCopy);
          setFtpErrorDetails(detailsCopy);
        } catch (parseError) {
          console.error('Error parsing details:', parseError);
          // If parsing fails, use the original object
          setFtpErrorDetails(errorDetails);
        }

        // Add code information if available
        if (errorDetails['Error Code']) {
          errorMessage += ` (Error code: ${errorDetails['Error Code']})`;
        } else if (errorDetails.code) {
          // Fallback for backward compatibility
          errorMessage += ` (Error code: ${errorDetails.code})`;
        }

        // Store troubleshooting tips if available
        if (data.troubleshooting && Array.isArray(data.troubleshooting)) {
          console.log('SharePoint troubleshooting tips:', data.troubleshooting);
          setFtpTroubleshootingTips(data.troubleshooting);
        } else {
          console.warn('No troubleshooting tips provided or not in expected format');
          // Set default troubleshooting tips
          setFtpTroubleshootingTips([
            'Check your network connection',
            'Verify SharePoint site is accessible',
            'Ensure Azure AD credentials are correct',
            'Try again in a few minutes'
          ]);
        }

        // Log the error message that will be displayed
        console.log('Setting error message:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error testing SharePoint connection:', error);

      // Create detailed error information even for client-side errors
      const clientErrorDetails = {
        message: error.message || 'Unknown error',
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: 'client-side-error'
      };

      console.log('Client-side error details:', clientErrorDetails);
      setFtpErrorDetails(clientErrorDetails);

      // Set default troubleshooting tips for client-side errors
      setFtpTroubleshootingTips([
        'Check your network connection',
        'Verify that the API server is running',
        'Try refreshing the page and attempting the operation again',
        'Check the browser console for more detailed error information'
      ]);

      // Set a descriptive error message
      const errorMessage = `Failed to test SharePoint connection: ${error.message || 'Unknown error'}`;
      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
      setFtpConnected(false);
    } finally {
      setFtpConnectionTesting(false);
    }
  }

  // Fetch files from SharePoint
  const fetchFtpFiles = async (directory) => {
    setError('')
    setFtpLoading(true)

    try {
      const response = await fetch(`/api/sharepoint?action=list&directory=${encodeURIComponent(directory)}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch SharePoint files')
      }

      setFtpFileList(data.files)
      setFtpCurrentDirectory(directory)

      // Update directory history for navigation
      if (!ftpDirectoryHistory.includes(directory)) {
        setFtpDirectoryHistory([...ftpDirectoryHistory, directory])
      }
    } catch (error) {
      console.error('Error fetching SharePoint files:', error)
      setError(error.message || 'Failed to fetch SharePoint files')
    } finally {
      setFtpLoading(false)
    }
  }

  // Navigate to a directory
  const navigateToDirectory = (directory) => {
    // If it's a parent directory (..)
    if (directory === '..') {
      // Split the current path and remove the last segment
      const pathParts = ftpCurrentDirectory.split('/')
      pathParts.pop()
      const parentDirectory = pathParts.join('/')
      fetchFtpFiles(parentDirectory)
    } else {
      // Construct the new path
      const newPath = ftpCurrentDirectory 
        ? `${ftpCurrentDirectory}/${directory}` 
        : directory
      fetchFtpFiles(newPath)
    }
  }

  // Get file content from SharePoint
  const getFileContent = async (filePath) => {
    setError('')
    setFtpLoading(true)

    try {
      const fullPath = ftpCurrentDirectory 
        ? `${ftpCurrentDirectory}/${filePath}` 
        : filePath

      const response = await fetch(`/api/sharepoint?action=content&filePath=${encodeURIComponent(fullPath)}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get file content')
      }

      setFtpFileContent(data.content)
      setFtpSelectedFile(filePath)
    } catch (error) {
      console.error('Error getting file content from SharePoint:', error)
      setError(error.message || 'Failed to get file content from SharePoint')
    } finally {
      setFtpLoading(false)
    }
  }

  // For server-side rendering, we need to ensure the initial state matches what will be rendered
  // We'll use a combination of CSS classes and client-side JS to handle the transitions
  // This approach avoids hydration mismatches by ensuring server and client render the same initial HTML

  // Determine visibility states based on component state and mounted status
  const showLoading = isLoading || !mounted
  const showAdmin = mounted && isAdmin && !isLoading

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
                <TabsTrigger value="admin-users">Admin Users</TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="people-admin-users">People Admin Users</TabsTrigger>
                    <TabsTrigger value="sharepoint-browser">SharePoint Browser</TabsTrigger>
                  </>
                )}
                {isPeopleAdmin && (
                  <>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="company-news">Company News</TabsTrigger>
                  </>
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

              <TabsContent value="admin-users">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new admin user */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Admin User</CardTitle>
                      <CardDescription>
                        Grant admin access to a user by email
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    <CardHeader>
                      <CardTitle>Existing Admin Users</CardTitle>
                      <CardDescription>
                        Manage users with admin access
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
              </TabsContent>

              <TabsContent value="people-admin-users">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new people admin user */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New People Admin</CardTitle>
                      <CardDescription>
                        Grant people admin access to a user by email
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    <CardHeader>
                      <CardTitle>Existing People Admins</CardTitle>
                      <CardDescription>
                        Manage users with people admin access
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                <p className="text-sm text-gray-500">{news.content.length > 100 ? `${news.content.substring(0, 100)}...` : news.content}</p>
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

              <TabsContent value="sharepoint-browser">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SharePoint Connection */}
                  <Card>
                    <CardHeader>
                      <CardTitle>SharePoint Connection</CardTitle>
                      <CardDescription>
                        Connect to SharePoint to browse files
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button 
                          onClick={testFtpConnection} 
                          className="w-full"
                          disabled={ftpConnectionTesting}
                        >
                          {ftpConnectionTesting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing Connection...
                            </>
                          ) : (
                            <>
                              <Server className="h-4 w-4 mr-2" />
                              Test SharePoint Connection
                            </>
                          )}
                        </Button>

                        {ftpConnected && (
                          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                            Connected to SharePoint
                          </div>
                        )}

                        {ftpErrorDetails && (
                          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Connection Error Details:</h4>
                            <div className="text-sm space-y-1">
                              {Object.entries(ftpErrorDetails).map(([key, value]) => {
                                // Skip complex objects or arrays
                                if (typeof value === 'object' && value !== null) {
                                  return (
                                    <div key={key}>
                                      <span className="font-medium">{key}:</span> [Complex Object]
                                    </div>
                                  );
                                }
                                return (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {value?.toString()}
                                  </div>
                                );
                              })}
                            </div>

                            {ftpTroubleshootingTips.length > 0 && (
                              <div className="mt-3">
                                <h4 className="font-semibold mb-1">Troubleshooting Tips:</h4>
                                <ul className="text-sm list-disc pl-5">
                                  {ftpTroubleshootingTips.map((tip, index) => (
                                    <li key={index}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* SharePoint Browser */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>SharePoint Browser</CardTitle>
                      <CardDescription>
                        Browse and view files on SharePoint
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ftpConnected ? (
                        <div className="space-y-4">
                          {/* Current directory and navigation */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                              Current: {ftpCurrentDirectory || '/'}
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigateToDirectory('..')}
                                disabled={!ftpCurrentDirectory}
                              >
                                Parent Directory
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => fetchFtpFiles(ftpCurrentDirectory)}
                                disabled={ftpLoading}
                              >
                                Refresh
                              </Button>
                            </div>
                          </div>

                          {/* File list */}
                          {ftpLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                          ) : (
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-100 px-4 py-2 font-medium text-sm grid grid-cols-12 gap-2">
                                <div className="col-span-6">Name</div>
                                <div className="col-span-2">Type</div>
                                <div className="col-span-2">Size</div>
                                <div className="col-span-2">Actions</div>
                              </div>
                              <div className="divide-y">
                                {ftpFileList.length === 0 ? (
                                  <div className="px-4 py-8 text-center text-gray-500">
                                    No files found in this directory
                                  </div>
                                ) : (
                                  ftpFileList.map((file, index) => (
                                    <div key={index} className="px-4 py-2 grid grid-cols-12 gap-2 items-center hover:bg-gray-50">
                                      <div className="col-span-6 truncate">
                                        {file.type === 'd' ? (
                                          <button 
                                            onClick={() => navigateToDirectory(file.name)}
                                            className="text-blue-600 hover:underline flex items-center"
                                          >
                                            <FileText className="h-4 w-4 mr-1" />
                                            {file.name}
                                          </button>
                                        ) : (
                                          <span className="flex items-center">
                                            <FileText className="h-4 w-4 mr-1 text-gray-400" />
                                            {file.name}
                                          </span>
                                        )}
                                      </div>
                                      <div className="col-span-2 text-sm">
                                        {file.type === 'd' ? 'Directory' : 'File'}
                                      </div>
                                      <div className="col-span-2 text-sm">
                                        {file.type === 'd' ? '-' : `${(file.size / 1024).toFixed(2)} KB`}
                                      </div>
                                      <div className="col-span-2">
                                        {file.type !== 'd' && (
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => getFileContent(file.name)}
                                          >
                                            View
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* File content viewer */}
                          {ftpSelectedFile && (
                            <Card>
                              <CardHeader className="py-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">
                                    {ftpSelectedFile}
                                  </CardTitle>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setFtpSelectedFile(null)
                                      setFtpFileContent('')
                                    }}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                                  <pre className="text-sm whitespace-pre-wrap">{ftpFileContent}</pre>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Server className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Connect to SharePoint to browse files</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
