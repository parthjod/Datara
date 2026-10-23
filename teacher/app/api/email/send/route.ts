import { NextRequest, NextResponse } from 'next/server'
import { SentEmail, Student } from '@/types'
import { appendEmailLogs, getEmailLogs, getStoredStudents } from '@/lib/students_store'

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
    const {
      type,
      recipients = [],
      customSubject,
      customBody,
    }: {
      type?: 'all_defaulters' | 'attendance' | 'marks' | 'all' | 'custom'
      recipients: Partial<Student>[]
      customSubject?: string
      customBody?: string
    } = body

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipient students provided.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const timestamp = new Date().toISOString()
    const newLogs: SentEmail[] = []

    // Cache stored students for full metadata fallback
    const storedStudents = getStoredStudents()
    const studentMap = new Map(storedStudents.map((s) => [s.roll_no, s]))

    recipients.forEach((student) => {
      const matched = student.roll_no ? studentMap.get(student.roll_no) : undefined
      const email =
        student.email ||
        matched?.email ||
        `${(student.name || 'student').toLowerCase().replace(/\s+/g, '.')}@mitwpu.edu.in`
      const name = student.name || matched?.name || 'Student'
      const rollNo = student.roll_no || matched?.roll_no || 'N/A'
      const panel = student.panel || matched?.panel || 'N/A'
      const att =
        student.attendance !== undefined
          ? Number(student.attendance)
          : matched?.attendance !== undefined
          ? Number(matched.attendance)
          : undefined
      const cca1 =
        student.cca1 !== undefined
          ? Number(student.cca1)
          : matched?.cca1 !== undefined
          ? Number(matched.cca1)
          : undefined
      const cca2 =
        student.cca2 !== undefined
          ? Number(student.cca2)
          : matched?.cca2 !== undefined
          ? Number(matched.cca2)
          : undefined
      const mid =
        student.midterm !== undefined
          ? Number(student.midterm)
          : matched?.midterm !== undefined
          ? Number(matched.midterm)
          : undefined
      const agg =
        student.aggregate !== undefined
          ? Number(student.aggregate)
          : cca1 !== undefined && cca2 !== undefined && mid !== undefined
          ? cca1 + cca2 + mid
          : matched?.aggregate !== undefined
          ? Number(matched.aggregate)
          : undefined

      const isAttDef = att !== undefined && att < 80
      const isMarksDef = agg !== undefined && agg < 24

      let emailType: SentEmail['type'] = 'attendance_defaulter'
      if (type === 'marks' || (isMarksDef && !isAttDef)) {
        emailType = 'marks_defaulter'
      } else if (type === 'attendance' || (isAttDef && !isMarksDef)) {
        emailType = 'attendance_defaulter'
      } else if (isAttDef && isMarksDef) {
        emailType = 'both_defaulters'
      } else {
        emailType = 'attendance_defaulter'
      }

      let subject = customSubject || 'Official Notice: Student Defaulter Intimation — MIT-WPU'
      let messageBody = customBody || ''

      if (!customSubject || !customBody) {
        if (isAttDef && isMarksDef) {
          subject = `CRITICAL NOTICE: Dual Academic & Attendance Defaulter Warning — MIT-WPU`
          messageBody = `Dear ${name} (Roll No: ${rollNo}, Panel ${panel}),\n\nThis is an urgent official communication from the School of Computer Science & Engineering, MIT World Peace University.\n\nYou have been flagged as a dual defaulter in both Attendance and Internal Academic Assessments:\n• Current Attendance: ${att}% (Mandatory Minimum: 80%)\n• Internal Assessment Aggregate: ${agg}/60 (Passing Benchmark: 24/60)\n  [CCA-1: ${cca1}/15, CCA-2: ${cca2}/15, Midterm: ${mid}/30]\n\nYou are at immediate risk of semester debarment. Report to your Panel Coordinator and Head of Department by tomorrow 10:00 AM.\n\nAcademic Monitoring Cell,\nMIT-WPU, Pune`
        } else if (isMarksDef) {
          subject = `ACADEMIC DEFICIENCY NOTICE: Internal Aggregate Below 24/60 (${agg}/60) — MIT-WPU`
          messageBody = `Dear ${name} (Roll No: ${rollNo}, Panel ${panel}),\n\nThis is an official notice regarding your Continuous Assessment performance for the current semester:\n• CCA-1 Score: ${cca1 !== undefined ? `${cca1} / 15` : 'N/A'}\n• CCA-2 Score: ${cca2 !== undefined ? `${cca2} / 15` : 'N/A'}\n• Mid-Term Examination: ${mid !== undefined ? `${mid} / 30` : 'N/A'}\n• Combined Aggregate Score: ${agg} / 60\n\nYour internal assessment aggregate is ${agg}/60, which falls below the mandatory passing benchmark of 24/60 (40%). Please schedule an immediate remedial session with your course faculty.\n\nExamination Cell,\nMIT-WPU, Pune`
        } else {
          subject = `URGENT: Low Attendance Defaulter Warning (${att !== undefined ? `${att}%` : '< 80%'}) — MIT-WPU`
          messageBody = `Dear ${name} (Roll No: ${rollNo}, Panel ${panel}),\n\nThis is an official intimation that your current class attendance is recorded at ${att !== undefined ? `${att}%` : 'below 80%'}, which does not satisfy the university mandatory requirement of 80% attendance.\n\nContinued failure to attend scheduled lectures and practical sessions will result in debarment from the upcoming End-Semester examinations.\n\nPlease resume regular class attendance immediately.\n\nDepartment of Computer Science & Engineering,\nMIT-WPU, Pune`
        }
      }

      newLogs.push({
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp,
        recipientEmail: email,
        recipientName: name,
        rollNo,
        panel,
        type: emailType,
        subject,
        body: messageBody,
        status: 'delivered',
      })
    })

    appendEmailLogs(newLogs)

    return NextResponse.json(
      {
        success: true,
        count: newLogs.length,
        logs: getEmailLogs().slice(0, 20),
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('Error in /api/email/send:', err)
    return NextResponse.json(
      { error: 'Internal server error while dispatching emails' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
