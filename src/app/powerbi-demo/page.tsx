'use client'

import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { DataTable } from '@/components/data-table'
import { DataCharts } from '@/components/data-charts'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Database, BarChart3, Table, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function PowerBIDemoPage() {
  const { data: session, status } = useSession()

  // Mock data that represents what your F3 Live Operations report might contain
  const mockColumns = [
    'Flight_Number', 'Aircraft_Type', 'Departure_Time', 'Arrival_Time', 
    'Origin', 'Destination', 'Status', 'Passengers', 'Delay_Minutes', 'Gate'
  ]

  const mockData = [
    ['F3001', 'A320', '06:00', '08:30', 'RUH', 'JED', 'On Time', 180, 0, 'A12'],
    ['F3002', 'A320', '07:15', '10:45', 'JED', 'CAI', 'Delayed', 165, 25, 'B05'],
    ['F3003', 'A321', '08:30', '11:00', 'RUH', 'DXB', 'On Time', 195, 0, 'A08'],
    ['F3004', 'A320', '09:45', '12:15', 'DXB', 'RUH', 'Boarding', 172, 5, 'C03'],
    ['F3005', 'A321', '10:30', '13:00', 'JED', 'AMM', 'On Time', 188, 0, 'B12'],
    ['F3006', 'A320', '11:45', '15:30', 'RUH', 'LHR', 'Delayed', 175, 45, 'A15'],
    ['F3007', 'A321', '12:00', '14:30', 'CAI', 'JED', 'On Time', 192, 0, 'B08'],
    ['F3008', 'A320', '13:15', '16:45', 'AMM', 'RUH', 'In Flight', 168, 0, 'A03'],
    ['F3009', 'A321', '14:30', '17:00', 'DXB', 'JED', 'On Time', 185, 0, 'C07'],
    ['F3010', 'A320', '15:45', '18:15', 'JED', 'RUH', 'Scheduled', 155, 0, 'B02'],
    ['F3011', 'A320', '16:00', '19:30', 'RUH', 'IST', 'Delayed', 178, 30, 'A18'],
    ['F3012', 'A321', '17:15', '19:45', 'IST', 'RUH', 'On Time', 190, 0, 'C12'],
    ['F3013', 'A320', '18:30', '21:00', 'JED', 'DXB', 'Boarding', 170, 10, 'B15'],
    ['F3014', 'A321', '19:45', '22:15', 'DXB', 'CAI', 'On Time', 183, 0, 'A22'],
    ['F3015', 'A320', '20:00', '22:30', 'CAI', 'JED', 'Scheduled', 162, 0, 'B18']
  ]

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
            You need to be signed in to view the demo.
          </p>
          <Link href="/">
            <Button className="w-full">
              Go to Login
            </Button>
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
              <Link href="/powerbi-data">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-raleway flex items-center">
                  <Sparkles className="mr-3" size={28} />
                  F3 Live Operations Demo
                </h1>
                <p className="text-white/70">
                  Demo of custom Power BI data visualization with Flyadeal styling
                </p>
              </div>
            </div>

            {/* Demo Badge */}
            <div className="bg-flyadeal-yellow/20 border border-flyadeal-yellow/40 rounded-lg px-4 py-2">
              <span className="text-flyadeal-yellow font-semibold text-sm">DEMO DATA</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <GlassmorphismContainer className="p-4 text-center">
              <div className="text-2xl font-bold text-flyadeal-yellow">
                {mockData.length}
              </div>
              <div className="text-white/70 text-sm">Total Flights</div>
            </GlassmorphismContainer>
            
            <GlassmorphismContainer className="p-4 text-center">
              <div className="text-2xl font-bold text-flyadeal-light-blue">
                {mockData.filter(row => row[6] === 'On Time').length}
              </div>
              <div className="text-white/70 text-sm">On Time</div>
            </GlassmorphismContainer>
            
            <GlassmorphismContainer className="p-4 text-center">
              <div className="text-2xl font-bold text-flyadeal-red">
                {mockData.filter(row => row[6] === 'Delayed').length}
              </div>
              <div className="text-white/70 text-sm">Delayed</div>
            </GlassmorphismContainer>
            
            <GlassmorphismContainer className="p-4 text-center">
              <div className="text-2xl font-bold text-flyadeal-green">
                {Math.round(mockData.reduce((sum, row) => sum + Number(row[7]), 0) / mockData.length)}
              </div>
              <div className="text-white/70 text-sm">Avg Passengers</div>
            </GlassmorphismContainer>
          </div>

          {/* Demo Notice */}
          <GlassmorphismContainer className="p-6 mb-6 border-flyadeal-yellow/40">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-flyadeal-yellow mt-1" />
              <div>
                <h3 className="text-flyadeal-yellow font-semibold mb-2">Demo Preview</h3>
                <p className="text-white/90 mb-2">
                  This shows how your <strong>F3 Live Operations</strong> data would look with our custom Flyadeal visualization system.
                </p>
                <p className="text-white/70 text-sm">
                  Once Power BI data access is configured, this will display your actual flight operations data with the same beautiful styling.
                </p>
              </div>
            </div>
          </GlassmorphismContainer>

          {/* Charts View */}
          <div className="mb-8">
            <DataCharts
              data={mockData}
              columns={mockColumns}
              title="Flight Operations Analytics"
            />
          </div>

          {/* Table View */}
          <DataTable
            data={mockData}
            columns={mockColumns}
            title="Live Flight Operations Data"
          />

          {/* Action Button */}
          <div className="mt-8 text-center">
            <GlassmorphismContainer className="p-6">
              <h3 className="text-white font-semibold mb-4">Ready to connect your real Power BI data?</h3>
              <div className="space-y-3">
                <Link href="/powerbi-data">
                  <Button className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90 mx-2">
                    <Database className="w-4 h-4 mr-2" />
                    Connect Real Data
                  </Button>
                </Link>
                <Link href="/api/powerbi/debug-data">
                  <Button variant="outline" className="mx-2">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Debug Connection
                  </Button>
                </Link>
              </div>
            </GlassmorphismContainer>
          </div>
        </div>
      </main>
    </div>
  )
}