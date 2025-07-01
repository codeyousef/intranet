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

export default function AdminPage() {
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

  // FTP Functions

  // Test FTP connection
  const testFtpConnection = async () => {
    setError('')
    setSuccess('')
    setFtpConnectionTesting(true)
    setFtpErrorDetails(null)
    setFtpTroubleshootingTips([])

    try {
      console.log('Starting FTP connection test...');
      const response = await fetch('/api/ftp?action=test')
      console.log('FTP test API response status:', response.status);

      const data = await response.json()

      // Log the entire response data for debugging
      console.log('FTP test response data:', data);
      console.log('FTP test response data.details:', data.details);
      console.log('FTP test response data.troubleshooting:', data.troubleshooting);

      if (!data.success) {
        console.error('FTP test failed with error:', data.error);
        throw new Error(data.error || 'Failed to test FTP connection')
      }

      setFtpConnected(data.connected)

      if (data.connected) {
        setSuccess('Successfully connected to FTP server')
        // If connected, fetch the root directory
        fetchFtpFiles('')
      } else {
        // Format detailed error message
        let errorMessage = 'Could not connect to FTP server';

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
        console.error('FTP connection error details:', errorDetails);

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
          console.log('FTP troubleshooting tips:', data.troubleshooting);
          setFtpTroubleshootingTips(data.troubleshooting);
        } else {
          console.warn('No troubleshooting tips provided or not in expected format');
          // Set default troubleshooting tips
          setFtpTroubleshootingTips([
            'Check your network connection',
            'Verify FTP server is online',
            'Ensure firewall is not blocking FTP traffic',
            'Try again in a few minutes'
          ]);
        }

        // Log the error message that will be displayed
        console.log('Setting error message:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error testing FTP connection:', error);

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
      const errorMessage = `Failed to test FTP connection: ${error.message || 'Unknown error'}`;
      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
      setFtpConnected(false);
    } finally {
      setFtpConnectionTesting(false);
    }
  }

  // Fetch files from FTP server
  const fetchFtpFiles = async (directory) => {
    setError('')
    setFtpLoading(true)

    try {
      const response = await fetch(`/api/ftp?action=list&directory=${encodeURIComponent(directory)}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch FTP files')
      }

      setFtpFileList(data.files)
      setFtpCurrentDirectory(directory)

      // Update directory history for navigation
      if (!ftpDirectoryHistory.includes(directory)) {
        setFtpDirectoryHistory([...ftpDirectoryHistory, directory])
      }
    } catch (error) {
      console.error('Error fetching FTP files:', error)
      setError(error.message || 'Failed to fetch FTP files')
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

  // Get file content
  const getFileContent = async (filePath) => {
    setError('')
    setFtpLoading(true)

    try {
      const fullPath = ftpCurrentDirectory 
        ? `${ftpCurrentDirectory}/${filePath}` 
        : filePath

      const response = await fetch(`/api/ftp?action=content&filePath=${encodeURIComponent(fullPath)}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get file content')
      }

      setFtpFileContent(data.content)
      setFtpSelectedFile(filePath)
    } catch (error) {
      console.error('Error getting file content:', error)
      setError(error.message || 'Failed to get file content')
    } finally {
      setFtpLoading(false)
    }
  }

  // If loading or not authenticated, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-flyadeal-yellow" />
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // If not admin, redirect (handled in useEffect)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen">
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
                  <TabsTrigger value="ftp-browser">FTP Browser</TabsTrigger>
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
                        Add Platform Link
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Existing platform links */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Existing Platform Links</CardTitle>
                    <CardDescription>
                      Manage existing platform links
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {platformLinks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No platform links found</p>
                    ) : (
                      <div className="space-y-4">
                        {platformLinks.map((link) => (
                          <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{link.title}</div>
                              <div className="text-sm text-gray-500">{link.url}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Icon: {link.icon} | Order: {link.display_order} | 
                                {link.is_active ? ' Active' : ' Inactive'}
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
                      Grant admin privileges to a user
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={addAdminUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={newAdminEmail} 
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="e.g. user@flyadeal.com"
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Admin User
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Existing admin users */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Existing Admin Users</CardTitle>
                    <CardDescription>
                      Manage existing admin users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {adminUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No admin users found</p>
                    ) : (
                      <div className="space-y-4">
                        {adminUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Added: {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => removeAdminUser(user.email)}
                              disabled={user.email === session?.user?.email}
                              title={user.email === session?.user?.email ? "Cannot remove yourself" : "Remove admin"}
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

            {isAdmin && (
              <TabsContent value="people-admin-users">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new people admin user */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New People Admin User</CardTitle>
                      <CardDescription>
                        Grant people admin privileges to a user
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={addPeopleAdminUser} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="people-admin-email">Email Address</Label>
                          <Input 
                            id="people-admin-email" 
                            type="email" 
                            value={newPeopleAdminEmail} 
                            onChange={(e) => setNewPeopleAdminEmail(e.target.value)}
                            placeholder="e.g. user@flyadeal.com"
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add People Admin User
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing people admin users */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Existing People Admin Users</CardTitle>
                      <CardDescription>
                        Manage existing people admin users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {peopleAdminUsers.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No people admin users found</p>
                      ) : (
                        <div className="space-y-4">
                          {peopleAdminUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{user.email}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Added: {new Date(user.created_at).toLocaleDateString()}
                                </div>
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
            )}

            {isPeopleAdmin && (
              <TabsContent value="events">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new event */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Event</CardTitle>
                      <CardDescription>
                        Create a new upcoming event
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
                            placeholder="e.g. Company Picnic"
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
                            rows={4}
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
                          <Plus className="h-4 w-4 mr-2" />
                          Add Event
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing events */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Upcoming Events</CardTitle>
                      <CardDescription>
                        Manage upcoming events
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {events.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No events found</p>
                      ) : (
                        <div className="space-y-4">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{event.title}</div>
                                <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Date: {new Date(event.event_date).toLocaleDateString()}
                                </div>
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
            )}

            {isPeopleAdmin && (
              <TabsContent value="company-news">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Add new company news */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add Company News</CardTitle>
                      <CardDescription>
                        Create a new company news item
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
                            rows={6}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="news-date">Publication Date</Label>
                          <Input 
                            id="news-date" 
                            type="date" 
                            value={newNewsItem.published_at} 
                            onChange={(e) => setNewNewsItem({...newNewsItem, published_at: e.target.value})}
                          />
                          <p className="text-xs text-gray-500">Leave empty to use current date</p>
                        </div>

                        <Button type="submit" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add News Item
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Existing company news */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Company News</CardTitle>
                      <CardDescription>
                        Manage company news items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {companyNews.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No news items found</p>
                      ) : (
                        <div className="space-y-4">
                          {companyNews.map((newsItem) => (
                            <div key={newsItem.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{newsItem.title}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {newsItem.content.length > 100 
                                    ? `${newsItem.content.substring(0, 100)}...` 
                                    : newsItem.content}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Published: {new Date(newsItem.published_at).toLocaleDateString()}
                                </div>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deleteCompanyNews(newsItem.id)}
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
            )}

            {/* FTP Browser Tab */}
            {isAdmin && (
              <TabsContent value="ftp-browser">
                <div className="grid grid-cols-1 gap-6">
                  {/* FTP Connection Test */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Server className="h-5 w-5 mr-2" />
                        FTP Server Browser
                      </CardTitle>
                      <CardDescription>
                        Browse and view files on the FTP server (read-only)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Connection Test */}
                        <div>
                          <Button 
                            onClick={testFtpConnection} 
                            disabled={ftpConnectionTesting}
                            className="mb-4"
                          >
                            {ftpConnectionTesting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing Connection...
                              </>
                            ) : (
                              <>
                                <Server className="h-4 w-4 mr-2" />
                                Test FTP Connection
                              </>
                            )}
                          </Button>

                          {ftpConnected && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                              Successfully connected to FTP server
                            </div>
                          )}

                          {/* Display detailed error information if available */}
                          {!ftpConnected && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                              <div className="font-medium mb-2 text-lg">FTP Connection Error Details:</div>

                              {/* Always show the error message at the top */}
                              <div className="font-medium text-base mb-4 border-l-4 border-red-400 pl-3 py-2 bg-red-50">
                                {error}
                              </div>

                              {ftpErrorDetails ? (
                                <div className="text-sm space-y-1">
                                  {/* Display friendly message if available */}
                                  {ftpErrorDetails.friendlyMessage && (
                                    <div className="font-medium text-base mb-2 border-l-4 border-red-400 pl-3 py-1">
                                      {ftpErrorDetails.friendlyMessage}
                                    </div>
                                  )}

                                  {/* Display connection information if available */}
                                  {ftpErrorDetails.connectionInfo && (
                                    <div className="bg-gray-50 p-3 rounded-md mb-3 border border-gray-200">
                                      <div className="font-medium mb-1">Connection Information:</div>
                                      <div><span className="font-medium">Host:</span> {ftpErrorDetails.connectionInfo.host}</div>
                                      <div><span className="font-medium">Port:</span> {ftpErrorDetails.connectionInfo.port}</div>
                                      <div><span className="font-medium">Secure:</span> {ftpErrorDetails.connectionInfo.secure ? 'Yes' : 'No'}</div>
                                      <div><span className="font-medium">Base Directory:</span> {ftpErrorDetails.connectionInfo.baseDirectory}</div>
                                      <div><span className="font-medium">Timestamp:</span> {new Date(ftpErrorDetails.connectionInfo.timestamp).toLocaleString()}</div>
                                    </div>
                                  )}

                                  {/* Display common error properties first */}
                                  <div className="bg-red-50 p-3 rounded-md mb-3 border border-red-200">
                                    <div className="font-medium mb-1">Error Details:</div>
                                    {ftpErrorDetails.code && (
                                      <div><span className="font-medium">Error Code:</span> {ftpErrorDetails.code}</div>
                                    )}
                                    {ftpErrorDetails.name && (
                                      <div><span className="font-medium">Error Type:</span> {ftpErrorDetails.name}</div>
                                    )}
                                    {ftpErrorDetails.message && (
                                      <div><span className="font-medium">Message:</span> {ftpErrorDetails.message}</div>
                                    )}
                                    {ftpErrorDetails.syscall && (
                                      <div><span className="font-medium">System Call:</span> {ftpErrorDetails.syscall}</div>
                                    )}
                                    {ftpErrorDetails.errno && (
                                      <div><span className="font-medium">Error Number:</span> {ftpErrorDetails.errno}</div>
                                    )}
                                  </div>

                                  {/* Display FTP-specific info */}
                                  {ftpErrorDetails.info && (
                                    <div className="bg-blue-50 p-3 rounded-md mb-3 border border-blue-200">
                                      <div className="font-medium mb-1">FTP-Specific Information:</div>
                                      <div><span className="font-medium">Additional Info:</span> {JSON.stringify(ftpErrorDetails.info)}</div>
                                    </div>
                                  )}

                                  {/* Display any other properties that might be present */}
                                  {Object.entries(ftpErrorDetails)
                                    .filter(([key]) => !['code', 'name', 'message', 'syscall', 'errno', 'info', 'stack', 'friendlyMessage', 'connectionInfo'].includes(key))
                                    .map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}:</span> 
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </div>
                                    ))
                                  }
                                </div>
                              ) : (
                                <div className="text-sm mb-3">
                                  <p>No detailed error information available. This could be due to:</p>
                                  <ul className="list-disc pl-5 mt-1 mb-2">
                                    <li>Error details not being properly captured</li>
                                    <li>Error details not being properly serialized</li>
                                    <li>Network issues preventing error details from being transmitted</li>
                                  </ul>
                                  <p>Check the browser console for more information.</p>
                                </div>
                              )}

                              <div className="mt-4 text-sm">
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                  <p className="font-medium text-yellow-800 mb-2">Troubleshooting Tips:</p>
                                  <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                                    {/* Display custom troubleshooting tips if available */}
                                    {ftpTroubleshootingTips.length > 0 ? (
                                      ftpTroubleshootingTips.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                      ))
                                    ) : (
                                      <>
                                        <li>Check your network connection</li>
                                        <li>Verify FTP server is online</li>
                                        <li>Ensure firewall is not blocking FTP traffic</li>
                                        <li>Try again in a few minutes</li>
                                      </>
                                    )}
                                  </ul>

                                  {/* Add additional help information */}
                                  <div className="mt-3 pt-3 border-t border-yellow-200">
                                    <p className="font-medium text-yellow-800 mb-1">Need more help?</p>
                                    <p className="text-yellow-700">
                                      If you continue to experience issues, please contact your network administrator 
                                      with the error details shown above. For ECONNRESET errors specifically, 
                                      this is often related to network configuration or firewall settings.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* File Browser - Only show if connected */}
                        {ftpConnected && (
                          <div className="space-y-4">
                            {/* Current Directory */}
                            <div className="bg-gray-50 p-3 rounded-lg flex items-center">
                              <span className="font-medium mr-2">Current Directory:</span>
                              <span className="text-gray-600">
                                {ftpCurrentDirectory || 'Root'}
                              </span>
                            </div>

                            {/* Directory Navigation */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => fetchFtpFiles('')}
                                disabled={ftpLoading}
                              >
                                Root
                              </Button>

                              {ftpCurrentDirectory && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => navigateToDirectory('..')}
                                  disabled={ftpLoading}
                                >
                                  Parent Directory
                                </Button>
                              )}
                            </div>

                            {/* File List */}
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-100 px-4 py-2 font-medium border-b">
                                Files and Directories
                              </div>

                              {ftpLoading ? (
                                <div className="p-8 flex justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                              ) : ftpFileList.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                  No files found in this directory
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {ftpFileList.map((file, index) => (
                                    <div 
                                      key={index} 
                                      className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                                      onClick={() => {
                                        if (file.type === 2) { // Directory
                                          navigateToDirectory(file.name)
                                        } else if (file.type === 1) { // File
                                          getFileContent(file.name)
                                        }
                                      }}
                                    >
                                      <div className="flex items-center">
                                        {file.type === 2 ? (
                                          // Directory
                                          <div className="text-blue-600 flex items-center">
                                            <Server className="h-4 w-4 mr-2" />
                                            <span>{file.name}</span>
                                          </div>
                                        ) : (
                                          // File
                                          <div className="flex items-center">
                                            <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                            <span>{file.name}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {file.type === 1 && (
                                          <span>{Math.round(file.size / 1024)} KB</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* File Content Viewer */}
                            {ftpSelectedFile && (
                              <Card>
                                <CardHeader className="py-3">
                                  <CardTitle className="text-base flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    {ftpSelectedFile}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="bg-gray-50 p-4 rounded-lg border overflow-x-auto">
                                    <pre className="text-sm whitespace-pre-wrap">
                                      {ftpFileContent || 'No content available'}
                                    </pre>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  )
}
