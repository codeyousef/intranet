import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { surveyId, optionId } = body

    if (!surveyId || !optionId) {
      return NextResponse.json(
        { error: 'Missing surveyId or optionId' },
        { status: 400 }
      )
    }

    // Check if survey exists and is active
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId }
    })

    if (!survey || !survey.isActive) {
      return NextResponse.json(
        { error: 'Survey not found or inactive' },
        { status: 404 }
      )
    }

    // Check if option exists and belongs to this survey
    const option = await prisma.surveyOption.findUnique({
      where: { id: optionId }
    })

    if (!option || option.surveyId !== surveyId) {
      return NextResponse.json(
        { error: 'Invalid option' },
        { status: 400 }
      )
    }

    // First ensure the user exists in the database
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null
        }
      })
    }

    // Check if user already voted
    const existingResponse = await prisma.surveyResponse.findUnique({
      where: {
        surveyId_userId: {
          surveyId,
          userId: user.id
        }
      }
    })

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already voted in this survey' },
        { status: 400 }
      )
    }


    // Create survey response
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        optionId,
        userId: user.id,
        userEmail: session.user.email
      }
    })

    // Get updated vote counts
    const voteCounts = await prisma.surveyResponse.groupBy({
      by: ['optionId'],
      where: { surveyId },
      _count: true
    })

    const voteCountMap = new Map(
      voteCounts.map((vc) => [vc.optionId, vc._count])
    )

    const totalVotes = voteCounts.reduce((sum: number, vc) => sum + vc._count, 0)

    // Get all options with updated stats
    const options = await prisma.surveyOption.findMany({
      where: { surveyId },
      orderBy: { displayOrder: 'asc' }
    })

    const optionsWithStats = options.map(opt => ({
      ...opt,
      voteCount: voteCountMap.get(opt.id) || 0,
      percentage: totalVotes > 0 
        ? Math.round(((voteCountMap.get(opt.id) || 0) / totalVotes) * 100)
        : 0
    }))

    return NextResponse.json({
      success: true,
      response,
      updatedStats: {
        options: optionsWithStats,
        totalVotes
      }
    })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    )
  }
}