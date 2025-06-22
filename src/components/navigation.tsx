'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { ThemeToggle } from './theme-toggle'
import { Button } from './ui/button'
import { Home, LogOut, Menu, X, Gift, Settings } from 'lucide-react'
import Image from 'next/image'

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

export function Navigation() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session) return

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
  }, [session])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <GlassmorphismContainer className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">+
            <Image 
              src="/images/logo.png" 
              alt="Company Logo" 
              width={40} 
              height={40} 
              className="rounded-sm"
            />
            <h1 className="text-xl font-bold text-black font-raleway">
              flyadeal Lounge
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-black/80 hover:text-black transition-colors no-underline text-inherit"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              )
            })}

            {/* Admin Link - Only shown to admin users */}
            {isAdmin && (
              <a
                href="/admin"
                className="flex items-center space-x-2 text-black/80 hover:text-black transition-colors no-underline text-inherit"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Settings size={18} />
                <span>Admin</span>
              </a>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {session?.user && (
              <div className="flex items-center space-x-3">
                {/* Theme Toggle */}
                <ThemeToggle />

                <div className="text-right">
                  <p className="text-black text-sm font-medium">
                    {session.user.name}
                  </p>
                  <p className="text-black/60 text-xs">
                    {session.user.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="text-black hover:bg-black/10"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-black"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-black/20">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 text-black/80 hover:text-black transition-colors p-2 no-underline text-inherit"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </a>
                )
              })}

              {/* Admin Link - Only shown to admin users */}
              {isAdmin && (
                <a
                  href="/admin"
                  className="flex items-center space-x-2 text-black/80 hover:text-black transition-colors p-2 no-underline text-inherit"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  <span>Admin</span>
                </a>
              )}

              {session?.user && (
                <div className="pt-3 border-t border-black/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-black text-sm font-medium">
                        {session.user.name}
                      </p>
                      <p className="text-black/60 text-xs">
                        {session.user.email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ThemeToggle />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="text-black hover:bg-black/10"
                      >
                        <LogOut size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </GlassmorphismContainer>
    </nav>
  )
}
