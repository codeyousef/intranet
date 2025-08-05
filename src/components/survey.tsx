'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, CheckCircle2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface SurveyOption {
  id: string
  text: string
  voteCount: number
  percentage: number
}

interface SurveyData {
  id: string
  title: string
  question: string
  options: SurveyOption[]
  hasVoted: boolean
  userResponseId: string | null
  totalVotes: number
}

export function Survey() {
  const { data: session } = useSession()
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    fetchSurvey()
  }, [])

  const fetchSurvey = async () => {
    try {
      const response = await fetch('/api/survey/active')
      const data = await response.json()
      
      if (data.survey) {
        setSurvey(data.survey)
        setShowResults(data.survey.hasVoted)
        if (data.survey.hasVoted) {
          setSelectedOption(data.survey.userResponseId)
        }
      }
    } catch (error) {
      console.error('Error fetching survey:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedOption || !survey) return

    setVoting(true)
    try {
      const response = await fetch('/api/survey/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          optionId: selectedOption
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update survey with new stats
        setSurvey({
          ...survey,
          options: data.updatedStats.options,
          hasVoted: true,
          userResponseId: selectedOption,
          totalVotes: data.updatedStats.totalVotes
        })
        setShowResults(true)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      alert('Failed to submit vote')
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (!survey) {
    return null
  }

  return (
    <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00539f]" />
          {survey.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{survey.question}</p>
      </div>

      {!showResults ? (
        <div className="space-y-3">
          {survey.options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedOption === option.id
                  ? 'border-[#00539f] bg-[#00539f]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === option.id
                    ? 'border-[#00539f]'
                    : 'border-gray-300'
                }`}>
                  {selectedOption === option.id && (
                    <div className="w-3 h-3 rounded-full bg-[#00539f]" />
                  )}
                </div>
                <span className="text-gray-700 dark:text-gray-200">{option.text}</span>
              </div>
            </button>
          ))}
          
          <Button
            onClick={handleVote}
            disabled={!selectedOption || voting}
            className="w-full mt-4 bg-[#00539f] hover:bg-[#00539f]/90"
          >
            {voting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {survey.hasVoted && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Thank you for voting!</span>
            </div>
          )}
          
          {survey.options.map((option) => (
            <div key={option.id} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${
                  option.id === selectedOption ? 'font-semibold text-[#00539f]' : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {option.text}
                  {option.id === selectedOption && ' (Your vote)'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {option.percentage}% ({option.voteCount})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    option.id === selectedOption
                      ? 'bg-[#00539f]'
                      : 'bg-[#00539f]/60'
                  }`}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Total votes: {survey.totalVotes}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}