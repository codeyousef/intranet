'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  BarChart3, 
  Users, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Download,
  PlusCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface SurveyOption {
  id: string
  text: string
  voteCount: number
  percentage: number
  responses?: {
    id: string
    userEmail: string
    userName: string
    createdAt: string
  }[]
}

interface Survey {
  id: string
  title: string
  question: string
  isActive: boolean
  createdAt: string
  totalResponses?: number
  responseCount?: number
  options: SurveyOption[]
}

export default function SurveyAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())
  const [showEmails, setShowEmails] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    try {
      const response = await fetch('/api/admin/surveys')
      const data = await response.json()
      
      if (data.surveys) {
        setSurveys(data.surveys)
        // Auto-select the active survey
        const activeSurvey = data.surveys.find((s: Survey) => s.isActive)
        if (activeSurvey) {
          fetchSurveyDetails(activeSurvey.id)
        }
      }
    } catch (error) {
      // Handle error silently or show user-friendly message
    } finally {
      setLoading(false)
    }
  }

  const fetchSurveyDetails = async (surveyId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/surveys?surveyId=${surveyId}`)
      const data = await response.json()
      
      if (data.survey) {
        setSelectedSurvey(data.survey)
      }
    } catch (error) {
      // Handle error silently or show user-friendly message
    } finally {
      setLoading(false)
    }
  }

  const toggleOptionExpanded = (optionId: string) => {
    const newExpanded = new Set(expandedOptions)
    if (newExpanded.has(optionId)) {
      newExpanded.delete(optionId)
    } else {
      newExpanded.add(optionId)
    }
    setExpandedOptions(newExpanded)
  }

  const exportToCSV = () => {
    if (!selectedSurvey || !selectedSurvey.options) return

    let csv = 'Survey,Question,Option,Vote Count,Percentage,User Email,User Name,Vote Date\n'
    
    selectedSurvey.options.forEach(option => {
      if (option.responses && option.responses.length > 0) {
        option.responses.forEach(response => {
          csv += `"${selectedSurvey.title}","${selectedSurvey.question}","${option.text}",${option.voteCount},${option.percentage}%,"${response.userEmail}","${response.userName}","${format(new Date(response.createdAt), 'yyyy-MM-dd HH:mm:ss')}"\n`
        })
      } else {
        csv += `"${selectedSurvey.title}","${selectedSurvey.question}","${option.text}",${option.voteCount},${option.percentage}%,"","",""\n`
      }
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `survey-results-${selectedSurvey.id}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (status === 'loading' || loading) {
    return (
      <div>
        <Navigation />
        <main className="pt-28 p-6">
          <div className="max-w-7xl mx-auto">
            <GlassmorphismContainer className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      <Navigation />
      
      <main className="pt-28 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Survey Results Admin</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">View and manage survey responses</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Survey List */}
            <div className="lg:col-span-1">
              <GlassmorphismContainer className="p-4">
                <h2 className="text-lg font-semibold mb-4">All Surveys</h2>
                <div className="space-y-2">
                  {surveys.map(survey => (
                    <button
                      key={survey.id}
                      onClick={() => fetchSurveyDetails(survey.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSurvey?.id === survey.id
                          ? 'bg-[#00539f] text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium truncate">{survey.title}</p>
                          <p className="text-sm opacity-80">
                            {survey.responseCount || 0} responses
                          </p>
                        </div>
                        {survey.isActive && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </GlassmorphismContainer>
            </div>

            {/* Survey Details */}
            <div className="lg:col-span-3">
              {selectedSurvey ? (
                <GlassmorphismContainer className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {selectedSurvey.title}
                      </h2>
                      <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                        {selectedSurvey.question}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created: {format(new Date(selectedSurvey.createdAt), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Total Responses: {selectedSurvey.totalResponses || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowEmails(!showEmails)}
                        size="sm"
                        variant="outline"
                      >
                        {showEmails ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {showEmails ? 'Hide' : 'Show'} Emails
                      </Button>
                      <Button
                        onClick={exportToCSV}
                        size="sm"
                        className="bg-[#00539f] hover:bg-[#00539f]/90"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-4">
                    {selectedSurvey.options.map(option => (
                      <Card key={option.id} className="p-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleOptionExpanded(option.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{option.text}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {option.voteCount} votes ({option.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                              <div
                                className="h-full bg-[#00539f] transition-all duration-500"
                                style={{ width: `${option.percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4">
                            {expandedOptions.has(option.id) ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Voter Details */}
                        {expandedOptions.has(option.id) && option.responses && option.responses.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                              Voters ({option.responses.length})
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {option.responses.map(response => (
                                <div key={response.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-300">
                                    {showEmails ? response.userEmail : response.userName}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {format(new Date(response.createdAt), 'MMM dd, HH:mm')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </GlassmorphismContainer>
              ) : (
                <GlassmorphismContainer className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Select a survey to view results</p>
                </GlassmorphismContainer>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}