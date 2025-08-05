import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the active survey with options and check if user has already voted
    const activeSurvey = await prisma.survey.findFirst({
      where: { isActive: true },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' }
        },
        responses: {
          where: { userEmail: session.user?.email || '' }
        }
      }
    })

    if (!activeSurvey) {
      return NextResponse.json({ survey: null })
    }

    // Check if user has already voted
    const hasVoted = activeSurvey.responses.length > 0
    const userResponse = hasVoted ? activeSurvey.responses[0] : null

    // Get vote counts for each option
    const voteCounts = await prisma.surveyResponse.groupBy({
      by: ['optionId'],
      where: { surveyId: activeSurvey.id },
      _count: true
    })

    // Create a map of optionId to count
    const voteCountMap = new Map(
      voteCounts.map((vc) => [vc.optionId, vc._count])
    )

    // Calculate total votes
    const totalVotes = voteCounts.reduce((sum, vc) => sum + vc._count, 0)

    // Transform options to include vote counts and percentages
    const optionsWithStats = activeSurvey.options.map(option => ({
      ...option,
      voteCount: voteCountMap.get(option.id) || 0,
      percentage: totalVotes > 0 
        ? Math.round(((voteCountMap.get(option.id) || 0) / totalVotes) * 100)
        : 0
    }))

    return NextResponse.json({
      survey: {
        id: activeSurvey.id,
        title: activeSurvey.title,
        question: activeSurvey.question,
        options: optionsWithStats,
        hasVoted,
        userResponseId: userResponse?.optionId || null,
        totalVotes
      }
    })
  } catch (error) {
    console.error('Error fetching active survey:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    )
  }
}