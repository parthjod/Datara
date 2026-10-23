import { NextRequest, NextResponse } from 'next/server'
import { getStoredStudents, saveStoredStudents } from '@/lib/students_store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Student } from '@/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawUpdates = Array.isArray(body.updates)
      ? body.updates
      : body.roll_no
      ? [body]
      : []

    if (rawUpdates.length === 0) {
      return NextResponse.json(
        { error: 'No marks update payloads provided.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const allStudents: Student[] = getStoredStudents()
    const studentMap = new Map<string, Student>()
    allStudents.forEach((s) => studentMap.set(s.roll_no, s))

    const updatedStudents: Student[] = []
    const validationErrors: string[] = []

    for (const update of rawUpdates) {
      const { roll_no, cca1, cca2, midterm, lca1, lca2, lca3, attendance } = update
      if (!roll_no || !studentMap.has(roll_no)) {
        validationErrors.push(`Student with roll number ${roll_no || 'undefined'} not found.`)
        continue
      }

      const student = studentMap.get(roll_no)!

      if (cca1 !== undefined && cca1 !== null && cca1 !== '') {
        const val = Number(cca1)
        if (isNaN(val) || val < 0 || val > 15) {
          validationErrors.push(`${roll_no}: CCA1 must be between 0 and 15 (got ${cca1})`)
          continue
        }
        student.cca1 = val
      }

      if (cca2 !== undefined && cca2 !== null && cca2 !== '') {
        const val = Number(cca2)
        if (isNaN(val) || val < 0 || val > 15) {
          validationErrors.push(`${roll_no}: CCA2 must be between 0 and 15 (got ${cca2})`)
          continue
        }
        student.cca2 = val
      }

      if (midterm !== undefined && midterm !== null && midterm !== '') {
        const val = Number(midterm)
        if (isNaN(val) || val < 0 || val > 30) {
          validationErrors.push(`${roll_no}: Midterm must be between 0 and 30 (got ${midterm})`)
          continue
        }
        student.midterm = val
      }

      if (lca1 !== undefined) {
        if (lca1 === null || lca1 === '') {
          student.lca1 = null
        } else {
          const val = Number(lca1)
          if (isNaN(val) || val < 0 || val > 33) {
            validationErrors.push(`${roll_no}: LCA1 must be between 0 and 33 (got ${lca1})`)
            continue
          }
          student.lca1 = val
          if (val > 0) {
            student.lca1_days_left = 10
            student.lca1_buffer_left = 4
            student.lca1_detention_pending = false
          }
        }
      }

      if (lca2 !== undefined) {
        if (lca2 === null || lca2 === '') {
          student.lca2 = null
        } else {
          const val = Number(lca2)
          if (isNaN(val) || val < 0 || val > 33) {
            validationErrors.push(`${roll_no}: LCA2 must be between 0 and 33 (got ${lca2})`)
            continue
          }
          student.lca2 = val
          if (val > 0) {
            student.lca2_days_left = 10
            student.lca2_buffer_left = 4
            student.lca2_detention_pending = false
          }
        }
      }

      if (lca3 !== undefined) {
        if (lca3 === null || lca3 === '') {
          student.lca3 = null
        } else {
          const val = Number(lca3)
          if (isNaN(val) || val < 0 || val > 34) {
            validationErrors.push(`${roll_no}: LCA3 must be between 0 and 34 (got ${lca3})`)
            continue
          }
          student.lca3 = val
          if (val > 0) {
            student.lca3_days_left = 10
            student.lca3_buffer_left = 4
            student.lca3_detention_pending = false
          }
        }
      }

      if (attendance !== undefined && attendance !== null && attendance !== '') {
        const val = Number(attendance)
        if (!isNaN(val) && val >= 0 && val <= 100) {
          student.attendance = Number(val.toFixed(1))
        }
      }

      if (
        student.detained &&
        (student.lca1 === null || student.lca1 > 0) &&
        (student.lca2 === null || student.lca2 > 0) &&
        (student.lca3 === null || student.lca3 > 0)
      ) {
        student.detained = false
      }

      // Dynamically compute updated internal aggregate
      student.aggregate = (Number(student.cca1) || 0) + (Number(student.cca2) || 0) + (Number(student.midterm) || 0)

      updatedStudents.push(student)
    }

    if (updatedStudents.length === 0 && validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    saveStoredStudents(allStudents)

    // Sync to Supabase in cloud/Vercel for cross-deployment live reflection
    if (isSupabaseConfigured && supabase) {
      try {
        const supabaseRows = updatedStudents.map((s) => ({
          roll_no: s.roll_no,
          name: s.name,
          email: s.email,
          phone: s.phone,
          address: s.address,
          aadhar: s.aadhar,
          dob: s.dob,
          gender: s.gender,
          department: s.department,
          panel: s.panel,
          year: s.year,
          program: s.program,
          attendance: s.attendance,
          cca1: s.cca1,
          cca2: s.cca2,
          midterm: s.midterm,
          aggregate: s.aggregate,
          lca1: s.lca1,
          lca2: s.lca2,
          lca3: s.lca3,
          detained: s.detained,
          lca1_days_left: s.lca1_days_left,
          lca1_buffer_left: s.lca1_buffer_left,
          lca1_detention_pending: s.lca1_detention_pending,
          lca2_days_left: s.lca2_days_left,
          lca2_buffer_left: s.lca2_buffer_left,
          lca2_detention_pending: s.lca2_detention_pending,
          lca3_days_left: s.lca3_days_left,
          lca3_buffer_left: s.lca3_buffer_left,
          lca3_detention_pending: s.lca3_detention_pending,
          updated_at: new Date().toISOString(),
        }))
        await supabase.from('students').upsert(supabaseRows, { onConflict: 'roll_no' })
      } catch (err) {
        console.warn('Supabase students upsert warning in admin:', err)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully logged and updated marks for ${updatedStudents.length} student(s) in real time.`,
        updatedCount: updatedStudents.length,
        warnings: validationErrors.length > 0 ? validationErrors : undefined,
        students: updatedStudents,
      },
      { headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('Error updating marks:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error while logging marks.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
