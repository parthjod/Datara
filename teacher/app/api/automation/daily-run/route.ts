import { NextRequest, NextResponse } from 'next/server'
import { executeDailyAutomationRun, getWorkflowState, getEmailLogs } from '@/lib/students_store'
import { reloadDatabase } from '@/lib/db'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST() {
  try {
    const result = executeDailyAutomationRun()
    // Reload database so SQL queries reflect new marks, countdowns, and detention
    reloadDatabase()

    return NextResponse.json(
      {
        success: true,
        state: result.state,
        summary: result.summary,
        recentLogs: getEmailLogs().slice(0, 20),
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('Error executing daily automation run:', err)
    return NextResponse.json(
      { error: 'Failed to execute daily automation run' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function GET() {
  try {
    const state = getWorkflowState()
    const logs = getEmailLogs().slice(0, 20)
    return NextResponse.json({ state, logs }, { headers: CORS_HEADERS })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500, headers: CORS_HEADERS })
  }
}
