import { NextResponse } from 'next/server'
import { resetWorkflow } from '@/lib/students_store'
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
    resetWorkflow()
    reloadDatabase()
    return NextResponse.json({ success: true, message: 'Workflow reset to Day 1' }, { headers: CORS_HEADERS })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to reset workflow' }, { status: 500, headers: CORS_HEADERS })
  }
}
