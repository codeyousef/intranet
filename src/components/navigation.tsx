'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { ThemeToggle } from './theme-toggle'
import { Button } from './ui/button'
import { Home, LogOut, Menu, X, Gift, Settings, ChevronDown, BarChart3 } from 'lucide-react'
import Image from 'next/image'

// Custom signout function
const handleSignOut = () => {
  console.log('Sign out button clicked')

  // Use the NextAuth signOut function
  signOut({ callbackUrl: '/' })
}

const navItems = [
  {
    label: 'Home',
    href: '/',
    icon: Home
  },
  {
    label: 'Employee Offers',
    href: '/mazaya',
    icon: Gift
  }
]

import { ClientOnly } from '@/lib/client-only'

export function Navigation() {
  // For server-side rendering, we'll render a simplified version of the navigation
  // Then use ClientOnly to render the dynamic parts on the client side only
  // This completely avoids hydration mismatches
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <GlassmorphismContainer className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and title - static content that's safe for SSR */}
          <div className="flex items-center space-x-4">
            <Image 
              src="/images/logo.png" 
              alt="Company Logo" 
              width={40} 
              height={40} 
              className="rounded-sm"
            />
            <h1 className="text-xl font-bold !text-black dark:!text-white font-raleway">
              flyadeal Lounge
            </h1>
          </div>

          {/* Client-only content - only rendered after hydration */}
          <ClientOnly>
            <NavigationContent />
          </ClientOnly>
        </div>
      </GlassmorphismContainer>
    </nav>
  )
}

// The actual dynamic content - only rendered on client
function NavigationContent() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)

  // Set mounted to true on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status !== 'authenticated' || !session) return

      try {
        const response = await fetch('/api/admin/check')
        const data = await response.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }

    if (session) {
      checkAdminStatus()
    }
  }, [status, session?.user?.email, session])

  return (
    <>
      {/* Desktop Navigation - Centered */}
      <div className="hidden md:flex items-center space-x-6 mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center space-x-2 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </a>
          )
        })}

        {/* Admin Link - Show only when user is admin */}
        {isAdmin && (
          <div className="relative admin-dropdown">
            <button
              onClick={() => setShowAdminDropdown(!showAdminDropdown)}
              className="flex items-center space-x-2 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
            >
              <Settings size={18} />
              <span>Admin</span>
              <ChevronDown size={14} className={`transition-transform ${showAdminDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showAdminDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                <a
                  href="/admin"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowAdminDropdown(false)}
                >
                  <div className="flex items-center space-x-2">
                    <Settings size={16} />
                    <span>Dashboard</span>
                  </div>
                </a>
                <a
                  href="/admin/surveys"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowAdminDropdown(false)}
                >
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={16} />
                    <span>Survey Results</span>
                  </div>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="hidden md:flex items-center space-x-4">
        {session?.user ? (
          <>
            {/* Theme Toggle - Rendered separately to avoid nesting issues */}
            <ThemeToggle />

            {/* User info and logout button */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="!text-black dark:!text-white text-sm font-medium">
                  {session.user.name}
                </p>
                <p className="!text-black/60 dark:!text-white/60 text-xs">
                  {session.user.email}
                </p>
              </div>
              {/* Use regular button for consistency with other sign out buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSignOut()
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-10 w-10"
                title="Sign Out"
              >
                {/* Use a consistent icon for server and client initial render */}
                <span className="w-[18px] h-[18px] flex items-center justify-center">
                  {mounted && <LogOut size={18} />}
                </span>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSignOut()
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-9 px-3"
          >
            {/* Use a consistent icon for server and client initial render */}
            <span className="w-[18px] h-[18px] mr-2 flex items-center justify-center">
              {mounted && <LogOut size={18} />}
            </span>
            Sign Out
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        type="button"
        className="md:hidden inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-10 w-10"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        title={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-4 right-4 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors p-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              )
            })}

            {/* Admin Links - Show only when user is admin */}
            {isAdmin && (
              <>
                <a
                  href="/admin"
                  className="flex items-center space-x-2 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors p-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  <span>Admin Dashboard</span>
                </a>
                <a
                  href="/admin/surveys"
                  className="flex items-center space-x-2 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors p-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BarChart3 size={18} />
                  <span>Survey Results</span>
                </a>
              </>
            )}

            {session?.user ? (
              <div className="pt-3 border-t border-black/20 dark:border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="!text-black dark:!text-white text-sm font-medium">
                      {session.user.name}
                    </p>
                    <p className="!text-black/60 dark:!text-white/60 text-xs">
                      {session.user.email}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Render ThemeToggle and LogOut button with more separation */}
                    <div className="inline-block">
                      <ThemeToggle />
                    </div>
                    <div className="inline-block">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSignOut()
                        }}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-10 w-10"
                        title="Sign Out"
                      >
                        {/* Use a consistent icon for server and client initial render */}
                        <span className="w-[18px] h-[18px] flex items-center justify-center">
                          {mounted && <LogOut size={18} />}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-black/20 dark:border-white/20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSignOut()
                  }}
                  className="inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-9 px-3 w-full"
                >
                  {/* Use a consistent icon for server and client initial render */}
                  <span className="w-[18px] h-[18px] mr-2 flex items-center justify-center">
                    {mounted && <LogOut size={18} />}
                  </span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
