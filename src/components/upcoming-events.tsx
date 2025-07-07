'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, ChevronRight } from 'lucide-react'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import Link from 'next/link'

interface Event {
  id: number
  title: string
  description: string
  event_date: string
  created_by: string
  created_at: string
  updated_at: string
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on mount to track if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        setEvents(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching events data:', err)
        setError('Failed to load events data')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (loading) {
    return (
      <GlassmorphismContainer className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-flyadeal-yellow" />
          Upcoming Events
        </h2>
        <div className="text-gray-500 text-center py-4">
          <p>Loading events data...</p>
        </div>
      </GlassmorphismContainer>
    )
  }

  if (error) {
    return (
      <GlassmorphismContainer className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-flyadeal-yellow" />
          Upcoming Events
        </h2>
        <div className="text-red-500 text-center py-4">
          <p>{error}</p>
        </div>
      </GlassmorphismContainer>
    )
  }

  return (
    <GlassmorphismContainer className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-flyadeal-yellow" />
        Upcoming Events
      </h2>
      <div className="space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-gray-800 font-medium mb-1">{event.title}</div>
              <div className="text-gray-600 text-sm">
                {event.event_date ? (
                  <>
                    {isClient ? (
                      <>
                        {new Date(event.event_date).toLocaleDateString()} at {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </>
                    ) : (
                      'Loading event date and time...'
                    )}
                  </>
                ) : (
                  'Date and time unavailable'
                )}
              </div>
              {event.description && (
                <div className="text-gray-500 text-xs mt-1">
                  {event.description.length > 100 
                    ? `${event.description.substring(0, 100)}...` 
                    : event.description}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center py-4">
            <p>No upcoming events</p>
          </div>
        )}
      </div>
    </GlassmorphismContainer>
  )
}
