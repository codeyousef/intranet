// Survey Types
export interface Survey {
  id: string
  title: string
  question: string
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface SurveyOption {
  id: string
  surveyId: string
  text: string
  displayOrder: number
  createdAt: Date | string
}

export interface SurveyResponse {
  id: string
  surveyId: string
  optionId: string
  userId: string
  userEmail: string
  createdAt: Date | string
}

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
}

// Extended types with relations
export interface SurveyWithOptions extends Survey {
  options: SurveyOption[]
}

export interface SurveyWithResponses extends Survey {
  responses: SurveyResponse[]
}

export interface SurveyWithRelations extends Survey {
  options: SurveyOption[]
  responses: SurveyResponse[]
  _count?: {
    responses: number
  }
}

export interface SurveyOptionWithResponses extends SurveyOption {
  responses: SurveyResponseWithUser[]
}

export interface SurveyResponseWithUser extends SurveyResponse {
  user: {
    email: string
    name: string | null
  }
}

// API Response types
export interface SurveyOptionWithStats extends SurveyOption {
  voteCount: number
  percentage: number
}

export interface SurveyOptionWithDetails extends SurveyOptionWithStats {
  responses?: {
    id: string
    userEmail: string
    userName: string
    createdAt: string
  }[]
}

export interface SurveyData {
  id: string
  title: string
  question: string
  options: SurveyOptionWithStats[]
  hasVoted: boolean
  userResponseId: string | null
  totalVotes: number
}

export interface SurveyWithDetails extends Survey {
  totalResponses?: number
  responseCount?: number
  options: SurveyOptionWithDetails[]
}

// Vote count types
export interface VoteCount {
  optionId: string
  _count: number
}

// Admin survey list item
export interface SurveyListItem extends Survey {
  responseCount?: number
  options: SurveyOption[]
}