'use client'

import { useState, useEffect } from 'react'
import { Cake, Award } from 'lucide-react'

interface Birthday {
  name: string
  date: string
  years?: number
  department?: string
}

interface Anniversary {
  name: string
  date: string
  years: number
  department?: string
}

interface CelebrationsData {
  birthdays: Birthday[] | null
  anniversaries: Anniversary[] | null
  tomorrowBirthdays: Birthday[] | null
  tomorrowAnniversaries: Anniversary[] | null
}

export function CelebrationsComponent() {
  const [data, setData] = useState<CelebrationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCelebrations() {
      try {
        const response = await fetch('/api/celebrations')
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        const celebrationsData = await response.json()
        setData(celebrationsData)
      } catch (err) {
        setError('Failed to load celebrations data')
      } finally {
        setLoading(false)
      }
    }

    fetchCelebrations()
  }, [])

  if (loading) {
    return (
      <div className="text-gray-500 text-center py-4">
        <p>Loading celebrations data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 dark:text-red-400 text-center py-4">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Birthdays Today */}
      <div className="mb-4">
        <h3 className="text-gray-700 dark:text-white font-medium mb-2 flex items-center">
          <Cake className="w-4 h-4 mr-1 text-pink-400" />
          Birthdays
        </h3>
        <div className="space-y-2">
          {data?.birthdays ? (
            data.birthdays.map((birthday, index) => (
              <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                <div className="text-gray-800 dark:text-white">{birthday.name}</div>
                <div className="text-gray-600 dark:text-white/60 text-xs">Today</div>
              </div>
            ))
          ) : (
            <div className="p-2 bg-white/5 border border-white/10 rounded text-sm text-gray-600 dark:text-white/60">
              No birthdays today
            </div>
          )}

          {/* Tomorrow's Birthdays - Only show if no birthdays today */}
          {(!data?.birthdays || data.birthdays.length === 0) && data?.tomorrowBirthdays && data.tomorrowBirthdays.length > 0 && (
            <>
              <div className="mt-2 text-xs font-medium text-gray-700 dark:text-white/70">Tomorrow:</div>
              {data.tomorrowBirthdays.map((birthday, index) => (
                <div key={`tomorrow-${index}`} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                  <div className="text-gray-800 dark:text-white">{birthday.name}</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">Tomorrow</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Anniversaries Today */}
      <div>
        <h3 className="text-gray-700 dark:text-white font-medium mb-2 flex items-center">
          <Award className="w-4 h-4 mr-1 text-flyadeal-yellow" />
          Work Anniversaries
        </h3>
        <div className="space-y-2">
          {data?.anniversaries ? (
            data.anniversaries.map((anniversary, index) => (
              <div key={index} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                <div className="text-gray-800 dark:text-white">{anniversary.name}</div>
                <div className="text-gray-600 dark:text-white/60 text-xs">
                  {anniversary.years} years • Today
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 bg-white/5 border border-white/10 rounded text-sm text-gray-600 dark:text-white/60">
              No work anniversaries today
            </div>
          )}

          {/* Tomorrow's Anniversaries - Only show if no anniversaries today */}
          {(!data?.anniversaries || data.anniversaries.length === 0) && data?.tomorrowAnniversaries && data.tomorrowAnniversaries.length > 0 && (
            <>
              <div className="mt-2 text-xs font-medium text-gray-700 dark:text-white/70">Tomorrow:</div>
              {data.tomorrowAnniversaries.map((anniversary, index) => (
                <div key={`tomorrow-${index}`} className="p-2 bg-white/5 border border-white/10 rounded text-sm">
                  <div className="text-gray-800 dark:text-white">{anniversary.name}</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">
                    {anniversary.years} years • Tomorrow
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
