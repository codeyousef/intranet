'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Button } from './ui/button'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // After hydration, we can show the appropriate icon
  useEffect(() => {
    setMounted(true)
  }, [])

  // To avoid hydration mismatch, we render the same content on server and initial client render
  // We use a regular button element instead of the Button component to avoid potential hydration mismatches
  // To avoid hydration mismatch, we need to ensure the server and client render exactly the same initial HTML
  // We'll render an empty span with the same dimensions and classes, and only add the icon after mounting
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 h-10 w-10"
    >
      {/* Use a consistent element for server and client initial render */}
      <span className="w-[18px] h-[18px] mr-2 flex items-center justify-center">
        {mounted && (theme === 'light' ? <Moon size={18} /> : <Sun size={18} />)}
      </span>
    </button>
  )
}
