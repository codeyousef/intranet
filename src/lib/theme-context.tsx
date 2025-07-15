'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with 'light' theme for consistent server-side rendering
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted
    setMounted(true)

    // Get saved theme from localStorage on component mount
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme)
    }

    // Apply theme class to body and html
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme')
      document.documentElement.classList.add('dark')
    } else {
      document.body.classList.remove('dark-theme')
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light'

      // Save to localStorage
      localStorage.setItem('theme', newTheme)

      // Apply theme class to body and html
      if (newTheme === 'dark') {
        document.body.classList.add('dark-theme')
        document.documentElement.classList.add('dark')
      } else {
        document.body.classList.remove('dark-theme')
        document.documentElement.classList.remove('dark')
      }

      return newTheme
    })
  }

  // Provide a consistent context value for server-side rendering
  // and initial client-side rendering to avoid hydration mismatches
  const contextValue = {
    // Always use 'light' theme for server-side rendering to ensure consistency
    theme: mounted ? theme : 'light',
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
