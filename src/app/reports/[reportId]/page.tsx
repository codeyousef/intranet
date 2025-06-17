'use client'

import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { PowerBIReport } from '@/components/power-bi-report'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ReportPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const reportId = params.reportId as string

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

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link href="/reports">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-raleway flex items-center">
                  <BarChart3 className="mr-3" size={28} />
                  Power BI Report
                </h1>
                <p className="text-white/70">
                  Report ID: {reportId}
                </p>
              </div>
            </div>
          </div>

          {/* Full-Width Report */}
          <PowerBIReport 
            reportId={reportId}
            className="w-full"
          />
        </div>
      </main>
    </div>
  )
}