'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Crown, Send, CheckCircle, AlertCircle, User, UserX } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

export function AskCEO() {
  const { theme } = useTheme()
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const categories = [
    { value: 'strategy', label: 'Company Strategy' },
    { value: 'culture', label: 'Company Culture' },
    { value: 'operations', label: 'Operations' },
    { value: 'growth', label: 'Growth & Development' },
    { value: 'benefits', label: 'Employee Benefits' },
    { value: 'communication', label: 'Communication' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setMessage('Please enter your question')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/ceo-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          category,
          is_anonymous: isAnonymous
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitStatus('success')
        setMessage(data.message)
        setContent('')
        setCategory('')
        
        // Reset form after 5 seconds
        setTimeout(() => {
          setSubmitStatus('idle')
          setMessage('')
        }, 5000)
      } else {
        setSubmitStatus('error')
        setMessage(data.error || 'Failed to submit question')
      }
    } catch (error) {
      setSubmitStatus('error')
      setMessage('Failed to submit question. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassmorphismContainer className="p-6">
      <div className="flex items-center mb-4">
        <Crown className="w-5 h-5 mr-2 text-flyadeal-yellow" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Ask CEO
        </h2>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-flyadeal-yellow/10 dark:bg-flyadeal-yellow/20 p-3 rounded-lg">
          {isAnonymous ? (
            <>
              <UserX className="w-4 h-4 text-flyadeal-purple dark:text-flyadeal-yellow" />
              <span>Your question will be submitted anonymously.</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-flyadeal-purple dark:text-flyadeal-yellow" />
              <span>
                Your question will be submitted as <strong>{session?.user?.name || session?.user?.email}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {submitStatus === 'idle' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="anonymous" 
              checked={isAnonymous} 
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="anonymous">Submit anonymously</Label>
          </div>

          <div>
            <Label htmlFor="ceo-category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ceo-category" className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ceo-content">Your Question</Label>
            <Textarea
              id="ceo-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ask the CEO anything about the company, strategy, culture, or share your thoughts..."
              rows={4}
              maxLength={5000}
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {content.length}/5000 characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="w-full bg-flyadeal-purple hover:bg-flyadeal-purple/90 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                {isAnonymous ? 'Submit Anonymously' : 'Submit Question'}
              </span>
            )}
          </Button>
        </form>
      )}

      {submitStatus === 'success' && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
          <p className="text-green-600 dark:text-green-400 font-medium">{message}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{message}</p>
          <Button
            onClick={() => {
              setSubmitStatus('idle')
              setMessage('')
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )}
    </GlassmorphismContainer>
  )
}