import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    azure_ad_client_id: !!process.env.AZURE_AD_CLIENT_ID,
    azure_ad_client_secret: !!process.env.AZURE_AD_CLIENT_SECRET,
    azure_ad_tenant_id: !!process.env.AZURE_AD_TENANT_ID,
    nextauth_url: process.env.NEXTAUTH_URL || 'not set',
    node_env: process.env.NODE_ENV
  })
}