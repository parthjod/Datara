import { NextRequest, NextResponse } from 'next/server'
import { getStoredStudents, saveStoredStudents } from '@/lib/students_store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Student } from '@/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const panel = searchParams.get('panel') || 'ALL'
    const category = searchParams.get('category') || 'all'
    const search = (searchParams.get('search') || '').toLowerCase().trim()

    let allStudents = getStoredStudents()

    // 1. Fetch live records from Supabase in cloud/Vercel if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaStudents, error } = await supabase
          .from('students')
          .select('*')
        if (!error && supaStudents && supaStudents.length > 0) {
          const supaMap = new Map((supaStudents as any[]).map((s) => [s.roll_no, s]))
          allStudents = allStudents.map((st) => {
            const supa = supaMap.get(st.roll_no)
            return supa ? { ...st, ...supa } : st
          })
          saveStoredStudents(allStudents)
        }
      } catch {}
    }

    // Ensure aggregate is dynamically computed from latest CCA1, CCA2, and Midterm
    allStudents = allStudents.map((s) => ({
      ...s,
      aggregate: (Number(s.cca1) || 0) + (Number(s.cca2) || 0) + (Number(s.midterm) || 0),
    }))

    // Calculate overall metrics
    const attendanceDefaultersCount = allStudents.filter((s) => s.attendance < 80).length
    const marksDefaultersCount = allStudents.filter(
      (s) => (s.aggregate ?? (s.cca1 + s.cca2 + s.midterm)) < 24
    ).length
    const lcaDefaultersCount = allStudents.filter(
      (s) => s.lca1 === null || s.lca2 === null || s.lca3 === null || s.lca1 === 0 || s.lca2 === 0 || s.lca3 === 0
    ).length
    const detainedCount = allStudents.filter((s) => s.detained).length

    // Filter
    let filtered = allStudents

    if (panel !== 'ALL') {
      filtered = filtered.filter((s) => s.panel === panel)
    }

    if (category === 'attendance') {
      filtered = filtered.filter((s) => s.attendance < 80)
    } else if (category === 'marks') {
      filtered = filtered.filter((s) => (s.aggregate ?? (s.cca1 + s.cca2 + s.midterm)) < 24)
    } else if (category === 'lca') {
      filtered = filtered.filter(
        (s) => s.lca1 === null || s.lca2 === null || s.lca3 === null || s.lca1 === 0 || s.lca2 === 0 || s.lca3 === 0
      )
    } else if (category === 'detained') {
      filtered = filtered.filter((s) => s.detained)
    }

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.roll_no.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search)
      )
    }

    return NextResponse.json(
      {
        metrics: {
          total: allStudents.length,
          attendanceDefaulters: attendanceDefaultersCount,
          marksDefaulters: marksDefaultersCount,
          lcaDefaulters: lcaDefaultersCount,
          detained: detainedCount,
        },
        students: filtered,
        count: filtered.length,
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('Error in /api/students:', err)
    return NextResponse.json(
      { error: 'Failed to fetch student database records' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
