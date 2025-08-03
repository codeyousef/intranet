'use client'

import { useEffect, useState } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { 
  Plane, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  BarChart3,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from '@/lib/theme-context'

interface FlightMetrics {
  totalFlights: number
  onTimeFlights: number
  delayedFlights: number
  cancelledFlights: number
  onTimePerformance: number
  averageDelayMinutes: number
  topDelayedRoutes: Array<{
    route: string
    delays: number
    avgDelay: number
  }>
  flightsByStatus: {
    onTime: number
    delayed: number
    cancelled: number
    diverted: number
  }
  todaysFlights: number
  lastUpdated: string
}

export function FlightStats() {
  const { theme } = useTheme()
  const [metrics, setMetrics] = useState<FlightMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchFlightData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[FlightStats] Fetching flight data...')
      const response = await fetch('/api/flight-data', {
        // Add credentials to ensure cookies are sent with the request
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('[FlightStats] Response status:', response.status)

      if (!response.ok) {
        // Try to get more detailed error information
        try {
          const responseText = await response.text();
          let errorData;

          try {
            // Try to parse as JSON
            errorData = JSON.parse(responseText);
            console.error('[FlightStats] API error details:', errorData);
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            // If not JSON, use the text directly
            console.error('[FlightStats] API error text:', responseText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}. ${responseText.substring(0, 100)}`);
          }
        } catch (textError) {
          // If we can't get the response text, use a generic error
          console.error('[FlightStats] Failed to get error details:', textError);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json()
      console.log('[FlightStats] Data received:', {
        success: data.success,
        hasMetrics: !!data.metrics,
        recordCount: data.recordCount || 'N/A'
      })

      if (data.success && data.metrics) {
        setMetrics(data.metrics)
        setLastRefresh(new Date())
        console.log('[FlightStats] Metrics updated successfully');
      } else {
        console.error('[FlightStats] API returned success:false or missing metrics:', data);
        throw new Error(data.error || 'Failed to load flight data: Missing metrics');
      }
    } catch (err: any) {
      console.error('[FlightStats] Error fetching flight data:', err.message);
      console.error('[FlightStats] Error stack:', err.stack);
      setError(err.message || 'Failed to load flight data');
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlightData()
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading && !metrics) {
    return (
      <GlassmorphismContainer className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Plane className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Loading flight data...</p>
          </div>
        </div>
      </GlassmorphismContainer>
    )
  }

  if (error && !metrics) {
    return (
      <GlassmorphismContainer className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={fetchFlightData}
              size="sm"
              className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
            >
              Retry
            </Button>
          </div>
        </div>
      </GlassmorphismContainer>
    )
  }

  return (
    <GlassmorphismContainer className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Plane className="w-5 h-5 mr-2 text-flyadeal-yellow" />
          Flight Operations Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Last updated: {formatTime(lastRefresh)}
          </span>
          <Button
            onClick={fetchFlightData}
            size="sm"
            variant="outline"
            disabled={loading}
            className={theme === 'dark' 
              ? "bg-gray-700/30 border-gray-400 text-gray-200 hover:bg-gray-600/50" 
              : "bg-white/10 border-gray-300 text-gray-700 hover:bg-gray-100"
            }
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* OTP Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className={`text-2xl font-bold ${
                  metrics.onTimePerformance >= 80 ? 'text-green-600' : 
                  metrics.onTimePerformance >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metrics.onTimePerformance}%
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">On-Time Performance</p>
            </div>

            {/* Today's Flights */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-flyadeal-purple" />
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {metrics.todaysFlights}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Today's Flights</p>
            </div>

            {/* Delays */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">
                  {metrics.delayedFlights}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Delayed Flights</p>
            </div>

            {/* Average Delay */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {metrics.averageDelayMinutes}m
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Delay</p>
            </div>
          </div>

          {/* Flight Status Bar */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <BarChart3 className="w-4 h-4 mr-1" />
              Flight Status Distribution
            </h3>
            <div className="flex h-8 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
              {metrics.totalFlights > 0 && (
                <>
                  <div 
                    className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${(metrics.flightsByStatus.onTime / metrics.totalFlights) * 100}%` }}
                    title={`On-Time: ${metrics.flightsByStatus.onTime}`}
                  >
                    {metrics.flightsByStatus.onTime > 0 && metrics.flightsByStatus.onTime}
                  </div>
                  <div 
                    className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${(metrics.flightsByStatus.delayed / metrics.totalFlights) * 100}%` }}
                    title={`Delayed: ${metrics.flightsByStatus.delayed}`}
                  >
                    {metrics.flightsByStatus.delayed > 0 && metrics.flightsByStatus.delayed}
                  </div>
                  <div 
                    className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${(metrics.flightsByStatus.cancelled / metrics.totalFlights) * 100}%` }}
                    title={`Cancelled: ${metrics.flightsByStatus.cancelled}`}
                  >
                    {metrics.flightsByStatus.cancelled > 0 && metrics.flightsByStatus.cancelled}
                  </div>
                  {metrics.flightsByStatus.diverted > 0 && (
                    <div 
                      className="bg-purple-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(metrics.flightsByStatus.diverted / metrics.totalFlights) * 100}%` }}
                      title={`Diverted: ${metrics.flightsByStatus.diverted}`}
                    >
                      {metrics.flightsByStatus.diverted}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">On-Time</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Delayed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Cancelled</span>
                </div>
                {metrics.flightsByStatus.diverted > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Diverted</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Delayed Routes */}
          {metrics.topDelayedRoutes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Top Delayed Routes
              </h3>
              <div className="space-y-2">
                {metrics.topDelayedRoutes.map((route, index) => (
                  <div 
                    key={route.route} 
                    className="flex justify-between items-center bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {route.route}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {route.delays} delays
                      </span>
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        Avg: {route.avgDelay}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </GlassmorphismContainer>
  )
}
