import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { queryGemini } from '@/lib/gemini'
import { executePostgresQuery } from '@/lib/db'
import { QueryApiResponse, Student, TeacherPermissions } from '@/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function getFilePath(): string {
  const parentPath = path.resolve(process.cwd(), '..', 'permissions.json')
  if (fs.existsSync(parentPath)) return parentPath
  const currentPath = path.resolve(process.cwd(), 'permissions.json')
  if (fs.existsSync(currentPath)) return currentPath
  return parentPath
}

function getTeacherLivePermissions(email: string): TeacherPermissions {
  const defaultPerms: TeacherPermissions = {
    panels: ['D', 'J'],
    years: ['TY'],
    departments: ['CSE'],
    active: true,
  }

  try {
    const filePath = getFilePath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      if (data && data[email]) {
        return data[email]
      }
    }
  } catch (err) {
    console.warn('Error reading permissions file for teacher query:', err)
  }

  return defaultPerms
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    const teacherEmail =
      typeof body.teacherEmail === 'string' && body.teacherEmail.trim()
        ? body.teacherEmail.trim()
        : (process.env.NEXT_PUBLIC_TEACHER_EMAIL || 'pramod.mali@mitwpu.edu.in')

    if (!query) {
      return NextResponse.json<QueryApiResponse>(
        {
          allowed: false,
          sql: '',
          interpretation: '',
          reason: 'Query string cannot be empty.',
          rows: [],
          totalCount: 0,
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // 1. Check live teacher authorization
    const perms = getTeacherLivePermissions(teacherEmail)
    if (!perms.active) {
      return NextResponse.json<QueryApiResponse>(
        {
          allowed: false,
          sql: '',
          interpretation: 'Account access deactivated',
          reason: 'Your faculty account access is currently deactivated by the administrator.',
          rows: [],
          totalCount: 0,
        },
        { headers: CORS_HEADERS }
      )
    }

    // 2. Send query to AI with only schema column data & faculty allowed panels
    const geminiResult = await queryGemini(query, perms.panels)

    // 3. Check if query is allowed by permission policy
    if (!geminiResult.allowed) {
      return NextResponse.json<QueryApiResponse>(
        {
          allowed: false,
          sql: geminiResult.sql,
          interpretation: geminiResult.interpretation,
          reason: geminiResult.reason || 'You do not have access to that student data.',
          rows: [],
          totalCount: 0,
        },
        { headers: CORS_HEADERS }
      )
    }

    // 4. Backend fires the PostgreSQL query against the Postgres database engine
    let executedSql = geminiResult.sql || ''
    let rows: Partial<Student>[] = []

    try {
      if (!executedSql) {
        throw new Error('No SQL query generated')
      }
      rows = executePostgresQuery(executedSql)
    } catch (sqlErr) {
      console.warn('Direct SQL query failed, generating safe fallback PostgreSQL query:', sqlErr)
      const safeFields =
        geminiResult.fields && geminiResult.fields.length > 0
          ? geminiResult.fields
          : ['roll_no', 'name', 'email', 'phone', 'panel']
      
      const panelClause = perms.panels.map((p) => `'${p}'`).join(', ')
      executedSql = `SELECT ${safeFields.join(', ')} FROM students WHERE panel IN (${panelClause}) AND year = 'TY' AND department = 'CSE';`
      rows = executePostgresQuery(executedSql)
    }

    // 5. Return data to frontend
    const responseData: QueryApiResponse = {
      allowed: true,
      sql: executedSql,
      interpretation: geminiResult.interpretation,
      rows: rows,
      totalCount: rows.length,
    }

    return NextResponse.json(responseData, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('API /api/query error:', err)
    return NextResponse.json(
      { error: 'Internal server error while executing query' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
