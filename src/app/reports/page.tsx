'use client'

import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { PowerBIReport } from '@/components/power-bi-report'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  const { data: session, status } = useSession()

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
            You need to be signed in to view reports.
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

  // The specific report ID from the URL you provided
  const REPORT_ID = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'

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
                  Power BI Reports
                </h1>
                <p className="text-white/70">
                  Access your business intelligence dashboards
                </p>
              </div>
            </div>
          </div>

          {/* Report Section */}
          <div className="space-y-6">
            <GlassmorphismContainer className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 font-raleway">
                Main Dashboard Report
              </h2>
              <p className="text-white/70 mb-6">
                Interactive Power BI report with real-time data visualization and analytics.
              </p>
              
              {/* Embedded Power BI Report */}
              <PowerBIReport 
                reportId={REPORT_ID}
                className="w-full"
              />
            </GlassmorphismContainer>

            {/* Additional Reports Section */}
            <GlassmorphismContainer className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 font-raleway">
                Available Reports
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">Sales Dashboard</h4>
                    <BarChart3 className="w-5 h-5 text-flyadeal-yellow" />
                  </div>
                  <p className="text-sm text-white/70 mb-3">
                    Comprehensive sales performance metrics and trends.
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    View Report
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">Operations Report</h4>
                    <BarChart3 className="w-5 h-5 text-flyadeal-light-blue" />
                  </div>
                  <p className="text-sm text-white/70 mb-3">
                    Daily operations and performance indicators.
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    View Report
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">Financial Analysis</h4>
                    <BarChart3 className="w-5 h-5 text-flyadeal-green" />
                  </div>
                  <p className="text-sm text-white/70 mb-3">
                    Financial performance and budget analysis.
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    View Report
                  </Button>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>
        </div>
      </main>
    </div>
  )
}