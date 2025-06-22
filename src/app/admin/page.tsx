'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Loader2
} from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [platformLinks, setPlatformLinks] = useState([])
  const [adminUsers, setAdminUsers] = useState([])

  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    icon: 'Link',
    display_order: 0,
    is_active: true
  })

  const [newAdminEmail, setNewAdminEmail] = useState('')
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

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        console.log('Checking admin status, session:', session);
        const response = await fetch('/api/admin/check')
        const data = await response.json()
        console.log('Admin check response:', data);

        if (!data.authenticated) {
          console.log('User not authenticated, redirecting to homepage');
          router.push('/')
          return
        }

        setIsAdmin(data.isAdmin)
        console.log('Setting isAdmin to:', data.isAdmin);

        if (!data.isAdmin) {
          console.log('User not admin, redirecting to homepage');
          router.push('/')
        } else {
          console.log('User is admin, loading data');
          // Load platform links and admin users
          fetchPlatformLinks()
          fetchAdminUsers()
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
      setPlatformLinks(data)
    } catch (error) {
      console.error('Error fetching platform links:', error)
      setError('Failed to fetch platform links')
    }
  }

  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      setAdminUsers(data)
    } catch (error) {
      console.error('Error fetching admin users:', error)
      setError('Failed to fetch admin users')
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
              Manage platform links and admin users
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
          </Tabs>
        </div>
      </main>
    </div>
  )
}
