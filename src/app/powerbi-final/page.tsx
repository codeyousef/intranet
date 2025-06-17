'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { DataTable } from '@/components/data-table'
import { DataCharts } from '@/components/data-charts'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, ExternalLink, Database, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// Sample data that matches F3 Live Operations structure
const sampleFlightData = [
  {
    flight: 'F3-121',
    route: 'RUH-JED',
    scheduled: '06:30',
    actual: '06:35',
    delay: 5,
    status: 'Departed',
    aircraft: 'A320-200',
    gate: 'A12',
    turnaround: 45
  },
  {
    flight: 'F3-122',
    route: 'JED-RUH',
    scheduled: '08:15',
    actual: '08:20',
    delay: 5,
    status: 'Airborne',
    aircraft: 'A320-200',
    gate: 'B08',
    turnaround: 50
  },
  {
    flight: 'F3-125',
    route: 'RUH-DMM',
    scheduled: '10:00',
    actual: '10:00',
    delay: 0,
    status: 'On Time',
    aircraft: 'A320-NEO',
    gate: 'A15',
    turnaround: 40
  },
  {
    flight: 'F3-130',
    route: 'JED-CAI',
    scheduled: '12:30',
    actual: '12:45',
    delay: 15,
    status: 'Delayed',
    aircraft: 'A321-200',
    gate: 'C05',
    turnaround: 60
  },
  {
    flight: 'F3-135',
    route: 'RUH-DXB',
    scheduled: '14:15',
    actual: '14:10',
    delay: -5,
    status: 'Early',
    aircraft: 'A320-NEO',
    gate: 'A18',
    turnaround: 55
  }
]

export default function PowerBIFinalPage() {
  const { data: session, status } = useSession()
  const [view, setView] = useState<'overview' | 'data' | 'charts'>('overview')

  const openInPowerBI = () => {
    window.open('https://app.powerbi.com/reports/e052d0dd-d79d-4fe2-bd0b-1991c8208c33', '_blank')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassmorphismContainer className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You need to be signed in to view the Power BI dashboard.
          </p>
          <Link href="/">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </GlassmorphismContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-raleway flex items-center">
                  <BarChart3 className="mr-3" size={28} />
                  F3 Live Operations Dashboard
                </h1>
                <p className="text-white/70">
                  Flight operations data with Flyadeal styling
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={openInPowerBI}
                className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Original Report
              </Button>
            </div>
          </div>

          {/* Status Banner */}
          <GlassmorphismContainer className="p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-flyadeal-yellow mt-0.5" />
              <div className="flex-1">
                <h3 className="text-flyadeal-yellow font-semibold text-sm mb-1">Data Access Status</h3>
                <p className="text-white/90 text-sm mb-3">
                  While we can access your Power BI report structure, extracting the underlying data requires additional permissions. 
                  This dashboard shows the intended design with representative flight operations data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white/80">Authentication ✓</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white/80">Report Access ✓</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white/80">UI Components ✓</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-flyadeal-yellow" />
                      <span className="text-white/80">Data Extraction (Needs Permissions)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-flyadeal-yellow" />
                      <span className="text-white/80">Live Data (Pending Setup)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassmorphismContainer>

          {/* Navigation Tabs */}
          <GlassmorphismContainer className="p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setView('overview')}
                variant={view === 'overview' ? "default" : "ghost"}
                size="sm"
                className={view === 'overview' 
                  ? 'bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90'
                  : 'text-white hover:bg-white/10'
                }
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </Button>
              <Button
                onClick={() => setView('data')}
                variant={view === 'data' ? "default" : "ghost"}
                size="sm"
                className={view === 'data' 
                  ? 'bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90'
                  : 'text-white hover:bg-white/10'
                }
              >
                <Database className="w-4 h-4 mr-2" />
                Data Table
              </Button>
              <Button
                onClick={() => setView('charts')}
                variant={view === 'charts' ? "default" : "ghost"}
                size="sm"
                className={view === 'charts' 
                  ? 'bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90'
                  : 'text-white hover:bg-white/10'
                }
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Charts
              </Button>
            </div>
          </GlassmorphismContainer>

          {/* Content */}
          {view === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Total Flights</p>
                    <p className="text-2xl font-bold text-flyadeal-yellow">
                      {sampleFlightData.length}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-flyadeal-yellow/60" />
                </div>
              </GlassmorphismContainer>

              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">On Time</p>
                    <p className="text-2xl font-bold text-green-400">
                      {sampleFlightData.filter(f => f.delay <= 0).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400/60" />
                </div>
              </GlassmorphismContainer>

              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Delayed</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {sampleFlightData.filter(f => f.delay > 0).length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-400/60" />
                </div>
              </GlassmorphismContainer>

              <GlassmorphismContainer className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Avg Turnaround</p>
                    <p className="text-2xl font-bold text-flyadeal-yellow">
                      {Math.round(sampleFlightData.reduce((sum, f) => sum + f.turnaround, 0) / sampleFlightData.length)}m
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-flyadeal-yellow/60" />
                </div>
              </GlassmorphismContainer>
            </div>
          )}

          {view === 'data' && (
            <GlassmorphismContainer className="p-6">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Flight Operations Data</h3>
                <p className="text-white/70 text-sm">
                  Sample data showing the structure and styling for F3 Live Operations
                </p>
              </div>
              <DataTable data={sampleFlightData} />
            </GlassmorphismContainer>
          )}

          {view === 'charts' && (
            <GlassmorphismContainer className="p-6">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Flight Operations Analytics</h3>
                <p className="text-white/70 text-sm">
                  Visual analytics with Flyadeal brand styling
                </p>
              </div>
              <DataCharts data={sampleFlightData} />
            </GlassmorphismContainer>
          )}

          {/* Next Steps */}
          <GlassmorphismContainer className="p-6 mt-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Implementation Roadmap
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="text-flyadeal-yellow font-medium mb-2">Current Status</h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>✓ Authentication working</li>
                  <li>✓ Report access confirmed</li>
                  <li>✓ UI components built</li>
                  <li>✓ Demo data integrated</li>
                </ul>
              </div>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="text-flyadeal-yellow font-medium mb-2">Next Phase</h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>→ Get dataset permissions</li>
                  <li>→ Implement data extraction</li>
                  <li>→ Replace demo with live data</li>
                  <li>→ Add real-time updates</li>
                </ul>
              </div>
              
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="text-flyadeal-yellow font-medium mb-2">Future Features</h4>
                <ul className="space-y-1 text-sm text-white/70">
                  <li>→ Interactive filtering</li>
                  <li>→ Export capabilities</li>
                  <li>→ Mobile optimization</li>
                  <li>→ Additional reports</li>
                </ul>
              </div>
            </div>
          </GlassmorphismContainer>
        </div>
      </main>
    </div>
  )
}