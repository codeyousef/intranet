import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return mock providers response
    return NextResponse.json({
      "azure-ad": {
        id: "azure-ad",
        name: "Azure Active Directory",
        type: "oauth",
        signinUrl: "/api/auth/signin/azure-ad",
        callbackUrl: "/api/auth/callback/azure-ad"
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}