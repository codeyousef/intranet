'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { FlyadealLogo } from './flyadeal-logo'
import { GlassmorphismContainer } from './glassmorphism-container'
import { Button } from './ui/button'
import { Home, BarChart3, Users, Settings, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    label: 'Team',
    href: '/team',
    icon: Users
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

export function Navigation() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <GlassmorphismContainer className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FlyadealLogo size="md" />
            <h1 className="text-xl font-bold text-white font-raleway">
              Flyadeal Intranet
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
                  className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {session?.user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-white text-sm font-medium">
                    {session.user.name}
                  </p>
                  <p className="text-white/60 text-xs">
                    {session.user.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="text-white hover:bg-white/10"
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
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/20">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors p-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
              
              {session?.user && (
                <div className="pt-3 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {session.user.name}
                      </p>
                      <p className="text-white/60 text-xs">
                        {session.user.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => signOut()}
                      className="text-white hover:bg-white/10"
                    >
                      <LogOut size={18} />
                    </Button>
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