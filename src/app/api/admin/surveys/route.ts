import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you might want to add proper role checking)
    // For now, we'll allow all authenticated users to view results
    
    const searchParams = request.nextUrl.searchParams
    const surveyId = searchParams.get('surveyId')

    if (surveyId) {
      // Get specific survey with all responses
      const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
            include: {
              responses: {
                include: {
                  user: {
                    select: {
                      email: true,
                      name: true
                    }
                  }
                },
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      })

      if (!survey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
      }

      // Calculate statistics
      const totalResponses = survey.options.reduce(
        (sum, option) => sum + option.responses.length,
        0
      )

      const optionsWithStats = survey.options.map(option => ({
        id: option.id,
        text: option.text,
        displayOrder: option.displayOrder,
        voteCount: option.responses.length,
        percentage: totalResponses > 0 
          ? Math.round((option.responses.length / totalResponses) * 100)
          : 0,
        responses: option.responses.map(response => ({
          id: response.id,
          userEmail: response.userEmail,
          userName: response.user.name || response.userEmail,
          createdAt: response.createdAt
        }))
      }))

      return NextResponse.json({
        survey: {
          id: survey.id,
          title: survey.title,
          question: survey.question,
          isActive: survey.isActive,
          createdAt: survey.createdAt,
          totalResponses,
          options: optionsWithStats
        }
      })
    } else {
      // Get all surveys
      const surveys = await prisma.survey.findMany({
        include: {
          _count: {
            select: { responses: true }
          },
          options: {
            orderBy: { displayOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        surveys: surveys.map(survey => ({
          id: survey.id,
          title: survey.title,
          question: survey.question,
          isActive: survey.isActive,
          createdAt: survey.createdAt,
          responseCount: survey._count.responses,
          options: survey.options
        }))
      })
    }
  } catch (error) {
    console.error('Error fetching surveys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    )
  }
}

// Create new survey
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, question, options } = body

    if (!title || !question || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Invalid survey data' },
        { status: 400 }
      )
    }

    // Deactivate all existing surveys
    await prisma.survey.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new survey
    const survey = await prisma.survey.create({
      data: {
        title,
        question,
        isActive: true,
        options: {
          create: options.map((opt: string, index: number) => ({
            text: opt,
            displayOrder: index + 1
          }))
        }
      },
      include: {
        options: true
      }
    })

    return NextResponse.json({ survey })
  } catch (error) {
    console.error('Error creating survey:', error)
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    )
  }
}