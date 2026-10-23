import { NextResponse } from 'next/server'
import { getEmailLogs, getWorkflowState } from '@/lib/students_store'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  try {
    const logs = getEmailLogs()
    const state = getWorkflowState()
    return NextResponse.json({ logs, state }, { headers: CORS_HEADERS })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve email logs' }, { status: 500, headers: CORS_HEADERS })
  }
}
