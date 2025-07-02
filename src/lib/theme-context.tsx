'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage if available, otherwise default to 'light'
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
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

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
