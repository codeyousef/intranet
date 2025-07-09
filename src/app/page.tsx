'use client'

/**
 * Newsletter Fetching Implementation:
 * 
 * The newsletter is fetched once per session and the state is stored in localStorage.
 * This prevents repeated fetching of the same content across page refreshes.
 * 
 * To force a fresh fetch of the newsletter:
 * 1. Use the reset button (visible in development mode)
 * 2. Add ?force_fetch=true to the URL
 * 3. Clear localStorage manually
 * 
 * Debugging:
 * - To enable detailed debug logging, run this in the browser console:
 *   localStorage.setItem('debug', 'true'); window.location.reload();
 * - To disable debug logging:
 *   localStorage.removeItem('debug'); window.location.reload();
 * - When enabled, look for logs starting with 🔍, 🔄, ✅, 🔒, etc.
 */

import dynamic from 'next/dynamic'

// Dynamic import with no SSR to avoid hydration issues
const PageContent = dynamic(() => import('./page-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )
})

export default function HomePage() {
  return <PageContent />
}