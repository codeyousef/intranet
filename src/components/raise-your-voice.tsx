'use client'

import { useState } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { MessageSquareWarning, Send, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

export function RaiseYourVoice() {
  const { theme } = useTheme()
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const categories = [
    { value: 'workplace', label: 'Workplace Environment' },
    { value: 'management', label: 'Management Issues' },
    { value: 'safety', label: 'Safety Concerns' },
    { value: 'harassment', label: 'Harassment/Discrimination' },
    { value: 'ethics', label: 'Ethics/Compliance' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setMessage('Please enter your feedback')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          category
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
        setMessage(data.error || 'Failed to submit feedback')
      }
    } catch (error) {
      setSubmitStatus('error')
      setMessage('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassmorphismContainer className="p-6">
      <div className="flex items-center mb-4">
        <MessageSquareWarning className="w-5 h-5 mr-2 text-red-500" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Raise Your Voice
        </h2>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Your feedback is completely anonymous. We cannot identify who submitted it.</span>
        </div>
      </div>

      {submitStatus === 'idle' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
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
            <Label htmlFor="content">Your Feedback</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your concerns or issues here. Remember, this is completely anonymous..."
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
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                Submit Anonymously
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