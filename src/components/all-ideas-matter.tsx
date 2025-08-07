'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Lightbulb, Send, CheckCircle, AlertCircle, User } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

export function AllIdeasMatter() {
  const { theme } = useTheme()
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const categories = [
    { value: 'process', label: 'Process Improvement' },
    { value: 'technology', label: 'Technology & Innovation' },
    { value: 'culture', label: 'Company Culture' },
    { value: 'customer', label: 'Customer Experience' },
    { value: 'efficiency', label: 'Efficiency & Cost Saving' },
    { value: 'employee', label: 'Employee Experience' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setMessage('Please enter your suggestion')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/suggestions', {
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
        setMessage(data.error || 'Failed to submit suggestion')
      }
    } catch (error) {
      setSubmitStatus('error')
      setMessage('Failed to submit suggestion. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassmorphismContainer className="p-6">
      <div className="flex items-center mb-4">
        <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          All Ideas Matter
        </h2>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <User className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span>
            Your suggestion will be submitted as <strong>{session?.user?.name || session?.user?.email}</strong>
          </span>
        </div>
      </div>

      {submitStatus === 'idle' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="idea-category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="idea-category" className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
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
            <Label htmlFor="idea-content">Your Idea</Label>
            <Textarea
              id="idea-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your ideas to improve our workplace, processes, or culture..."
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
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                Submit Your Idea
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