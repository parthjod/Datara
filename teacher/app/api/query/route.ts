import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parseOfflineQuery } from '@/lib/parser'
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

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

async function getTeacherLivePermissions(email: string): Promise<TeacherPermissions> {
  const defaultPerms: TeacherPermissions = {
    panels: ['D', 'J'],
    years: ['TY'],
    departments: ['CSE'],
    active: true,
  }

  // 1. Try Supabase in production/cloud if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('faculty_permissions')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (!error && data) {
        return {
          panels: data.panels || [],
          years: data.years || [],
          departments: data.departments || [],
          active: Boolean(data.active),
        }
      }
    } catch {}
  }

  // 2. Fallback to local permissions.json
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
        : (process.env.NEXT_PUBLIC_TEACHER_EMAIL || 'teacher@mitwpu.edu.in')

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
    const perms = await getTeacherLivePermissions(teacherEmail)
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

    // 2. Parse query using local offline parser with faculty allowed panels
    const parsedResult = parseOfflineQuery(query, perms.panels)

    // 3. Check if query is allowed by permission policy
    if (!parsedResult.allowed) {
      return NextResponse.json<QueryApiResponse>(
        {
          allowed: false,
          sql: parsedResult.sql,
          interpretation: parsedResult.interpretation,
          reason: parsedResult.reason || 'You do not have access to that student data.',
          rows: [],
          totalCount: 0,
        },
        { headers: CORS_HEADERS }
      )
    }

    // 4. Backend fires the PostgreSQL query against the Postgres database engine
    let executedSql = parsedResult.sql || ''
    let rows: Partial<Student>[] = []

    try {
      if (!executedSql) {
        throw new Error('No SQL query generated')
      }
      rows = executePostgresQuery(executedSql)
    } catch (sqlErr) {
      console.warn('Direct SQL query failed, generating safe fallback PostgreSQL query:', sqlErr)
      const safeFields =
        parsedResult.fields && parsedResult.fields.length > 0
          ? parsedResult.fields
          : ['roll_no', 'name', 'email', 'phone', 'panel']
      
      const panelClause = perms.panels.map((p) => `'${p}'`).join(', ')
      executedSql = `SELECT ${safeFields.join(', ')} FROM students WHERE panel IN (${panelClause}) AND year = 'TY' AND department = 'CSE';`
      rows = executePostgresQuery(executedSql)
    }

    // Merge Supabase student marks overrides if configured
    if (isSupabaseConfigured && supabase && rows.length > 0) {
      try {
        const rollNos = rows.map((r) => r.roll_no).filter(Boolean)
        const { data: supaRows } = await supabase
          .from('students')
          .select('*')
          .in('roll_no', rollNos)
        if (supaRows && supaRows.length > 0) {
          const supaMap = new Map((supaRows as any[]).map((s) => [s.roll_no, s]))
          rows = rows.map((r) => {
            const override = supaMap.get(r.roll_no)
            if (!override) return r
            // STRICTLY preserve only the queried keys in r
            const updated: Record<string, unknown> = {}
            for (const key of Object.keys(r)) {
              updated[key] =
                (override as any)[key] !== undefined && (override as any)[key] !== null
                  ? (override as any)[key]
                  : (r as any)[key]
            }
            if ('aggregate' in updated) {
              const c1 = Number(override.cca1 ?? updated.cca1 ?? 0)
              const c2 = Number(override.cca2 ?? updated.cca2 ?? 0)
              const mid = Number(override.midterm ?? updated.midterm ?? 0)
              updated.aggregate = override.aggregate !== undefined ? override.aggregate : c1 + c2 + mid
            }
            return updated as Partial<Student>
          })
        }
      } catch {}
    }

    // 5. Return data to frontend
    const responseData: QueryApiResponse = {
      allowed: true,
      sql: executedSql,
      interpretation: parsedResult.interpretation,
      rows: rows,
      totalCount: rows.length,
      fields:
        parsedResult.fields && parsedResult.fields.length > 0
          ? parsedResult.fields.map((f: string) =>
              f.includes(' AS ') ? f.split(' AS ')[1].trim() : f.trim()
            )
          : rows[0]
          ? Object.keys(rows[0])
          : ['roll_no', 'name', 'panel'],
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
