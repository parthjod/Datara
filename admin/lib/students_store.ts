import fs from 'fs'
import path from 'path'
import os from 'os'
import { Student, SentEmail, WorkflowState } from '@/types'
import { generateStudents } from './students'
import { supabase, isSupabaseConfigured } from './supabase'

const TMP_STUDENTS_FILE = path.join(os.tmpdir(), 'datara_students_data.json')

declare global {
  var __datara_students: Student[] | undefined
}

function getFilePath(filename: string): string {
  const parentPath = path.resolve(process.cwd(), '..', filename)
  if (fs.existsSync(parentPath)) return parentPath
  const currentPath = path.resolve(process.cwd(), filename)
  if (fs.existsSync(currentPath)) return currentPath

  const dirName = path.basename(process.cwd())
  if (dirName === 'teacher' || dirName === 'admin') {
    return parentPath
  }
  return currentPath
}

export function getStoredStudents(): Student[] {
  // 1. In-memory global cache
  if (globalThis.__datara_students && globalThis.__datara_students.length > 0) {
    return globalThis.__datara_students
  }

  // 2. Check /tmp on Vercel serverless
  try {
    if (fs.existsSync(TMP_STUDENTS_FILE)) {
      const raw = fs.readFileSync(TMP_STUDENTS_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__datara_students = parsed
        return parsed
      }
    }
  } catch {}

  // 3. Fallback: bundled students_data.json
  try {
    const filePath = getFilePath('students_data.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__datara_students = parsed
        return parsed
      }
    }
  } catch (err) {
    console.warn('Error reading stored students in admin:', err)
  }
  const fresh = generateStudents()
  saveStoredStudents(fresh)
  return fresh
}

export function saveStoredStudents(students: Student[]): void {
  globalThis.__datara_students = students

  // 1. Write to /tmp (always writable on Vercel serverless)
  try {
    fs.writeFileSync(TMP_STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Could not write to tmp students file:', err)
  }

  // 2. Write to project directory (works in local dev)
  try {
    const filePath = getFilePath('students_data.json')
    fs.writeFileSync(filePath, JSON.stringify(students, null, 2), 'utf-8')
  } catch (err) {
    // Expected on Vercel due to read-only filesystem
  }
}

export function getEmailLogs(): SentEmail[] {
  try {
    const filePath = getFilePath('email_logs.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.warn('Error reading email logs:', err)
  }
  return []
}

export function appendEmailLogs(newLogs: SentEmail[]): void {
  try {
    const existing = getEmailLogs()
    const combined = [...newLogs, ...existing]
    const capped = combined.slice(0, 500)
    const filePath = getFilePath('email_logs.json')
    fs.writeFileSync(filePath, JSON.stringify(capped, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error appending email logs:', err)
  }
}

export function getWorkflowState(): WorkflowState {
  try {
    const filePath = getFilePath('workflow_state.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Error reading workflow state:', err)
  }
  return {
    dayNumber: 1,
    lastRunTimestamp: new Date().toISOString(),
    totalDailyRuns: 0,
  }
}

export function saveWorkflowState(state: WorkflowState): void {
  try {
    const filePath = getFilePath('workflow_state.json')
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error saving workflow state:', err)
  }
}

export function executeDailyAutomationRun(): {
  state: WorkflowState
  summary: {
    attendanceEmails: number
    marksEmails: number
    lcaReminders: number
    lcaDeadlinePassed: number
    lcaBufferWarnings: number
    lcaZeroAssigned: number
    detentionNotices: number
    totalEmails: number
  }
  newLogs: SentEmail[]
} {
  const students = getStoredStudents()
  const prevState = getWorkflowState()
  const nextDay = prevState.dayNumber + 1
  const timestamp = new Date().toISOString()
  const newLogs: SentEmail[] = []

  let attendanceEmails = 0
  let marksEmails = 0
  let lcaReminders = 0
  let lcaDeadlinePassed = 0
  let lcaBufferWarnings = 0
  let lcaZeroAssigned = 0
  let detentionNotices = 0

  students.forEach((student) => {
    // 1. Attendance Defaulter Check (<80%)
    if (student.attendance < 80) {
      attendanceEmails++
      newLogs.push({
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp,
        recipientEmail: student.email,
        recipientName: student.name,
        rollNo: student.roll_no,
        panel: student.panel,
        type: 'daily_attendance_reminder',
        subject: `[Daily Reminder Day ${nextDay}] Low Attendance Alert: ${student.attendance}% (Required: ≥80%)`,
        body: `Dear ${student.name} (Roll: ${student.roll_no}),\n\nThis is your automated daily attendance reminder. Your current attendance is recorded at ${student.attendance}%, which is below the mandatory 80% threshold. You are on the departmental defaulters list.\n\nPlease attend all upcoming scheduled classes and labs immediately to prevent examination debarment.\n\nAcademic Office, MIT-WPU`,
        status: 'delivered',
      })
    }

    // 2. Marks Defaulter Check (aggregate < 24 / 60)
    const aggregate = student.cca1 + student.cca2 + student.midterm
    if (aggregate < 24) {
      marksEmails++
      newLogs.push({
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp,
        recipientEmail: student.email,
        recipientName: student.name,
        rollNo: student.roll_no,
        panel: student.panel,
        type: 'daily_marks_reminder',
        subject: `[Daily Warning Day ${nextDay}] Academic Deficiency: Aggregate ${aggregate}/60 (Below 24)`,
        body: `Dear ${student.name} (Roll: ${student.roll_no}),\n\nThis is your automated daily academic status reminder. Your internal evaluation scores:\n• CCA-1: ${student.cca1} / 15\n• CCA-2: ${student.cca2} / 15\n• Mid-Term: ${student.midterm} / 30\n• Aggregate Total: ${aggregate} / 60\n\nYour aggregate is below the minimum required passing benchmark of 24/60. Please arrange an immediate consultation with your course faculty for remedial sessions.\n\nExamination Cell, MIT-WPU`,
        status: 'delivered',
      })
    }

    // 3. LCA Workflow
    const lcaKeys = ['lca1', 'lca2', 'lca3'] as const

    lcaKeys.forEach((key) => {
      const daysKey = `${key}_days_left` as keyof Student
      const bufferKey = `${key}_buffer_left` as keyof Student
      const pendingDetentionKey = `${key}_detention_pending` as keyof Student
      const lcaLabel = key.toUpperCase()

      if (student[key] === null) {
        let daysLeft = (student[daysKey] as number | undefined) ?? 10
        let bufferLeft = (student[bufferKey] as number | undefined) ?? 4

        if (daysLeft > 1) {
          lcaReminders++
          newLogs.push({
            id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            timestamp,
            recipientEmail: student.email,
            recipientName: student.name,
            rollNo: student.roll_no,
            panel: student.panel,
            type: 'lca_reminder',
            subject: `[LCA Reminder] ${daysLeft} Day(s) Remaining to Appear for ${lcaLabel}`,
            body: `Dear ${student.name},\n\nYou have not yet appeared for ${lcaLabel}. You have ${daysLeft} day(s) remaining before the submission window closes.\n\nPlease schedule and complete your evaluation promptly.\n\nEvaluation Coordinator, MIT-WPU`,
            status: 'delivered',
          })
          ;(student as any)[daysKey] = daysLeft - 1
        } else if (daysLeft === 1) {
          lcaReminders++
          newLogs.push({
            id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            timestamp,
            recipientEmail: student.email,
            recipientName: student.name,
            rollNo: student.roll_no,
            panel: student.panel,
            type: 'lca_reminder',
            subject: `[URGENT] Final Day of Deadline to Appear for ${lcaLabel}`,
            body: `Dear ${student.name},\n\nToday is your final day of the 10-day period to appear for ${lcaLabel}. If you do not appear today, your assessment window will expire and enter the buffer grace phase.\n\nAcademic Office, MIT-WPU`,
            status: 'delivered',
          })
          ;(student as any)[daysKey] = 0
          ;(student as any)[bufferKey] = 4
        } else if (daysLeft === 0) {
          if (bufferLeft === 4) {
            lcaDeadlinePassed++
            newLogs.push({
              id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              timestamp,
              recipientEmail: student.email,
              recipientName: student.name,
              rollNo: student.roll_no,
              panel: student.panel,
              type: 'lca_deadline_passed',
              subject: `[DEADLINE EXPIRED] 10-Day Window Exceeded for ${lcaLabel} — 4-Day Buffer Started`,
              body: `Dear ${student.name},\n\nYou have gone through and exceeded the standard 10-day deadline for appearing in ${lcaLabel}.\n\nA strictly limited 4-day buffer period has commenced today. If you do not appear within the next 4 days, a mark of 0 will be permanently recorded in your academic ledger.\n\nDean Academic Affairs, MIT-WPU`,
              status: 'delivered',
            })
            ;(student as any)[bufferKey] = 3
          } else if (bufferLeft > 1 && bufferLeft < 4) {
            lcaBufferWarnings++
            newLogs.push({
              id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              timestamp,
              recipientEmail: student.email,
              recipientName: student.name,
              rollNo: student.roll_no,
              panel: student.panel,
              type: 'lca_buffer_warning',
              subject: `[FINAL WARNING] Buffer Day ${5 - bufferLeft} of 4: ${bufferLeft} Days Left for ${lcaLabel}`,
              body: `Dear ${student.name},\n\nThis is your buffer warning. You have ${bufferLeft} day(s) left to appear for ${lcaLabel}. Failure to appear within the next ${bufferLeft} days will result in a permanent score of 0.\n\nAcademic Evaluation Cell, MIT-WPU`,
              status: 'delivered',
            })
            ;(student as any)[bufferKey] = bufferLeft - 1
          } else if (bufferLeft === 1) {
            lcaZeroAssigned++
            student[key] = 0
            ;(student as any)[bufferKey] = 0
            ;(student as any)[pendingDetentionKey] = true
            newLogs.push({
              id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              timestamp,
              recipientEmail: student.email,
              recipientName: student.name,
              rollNo: student.roll_no,
              panel: student.panel,
              type: 'lca_zero_assigned',
              subject: `[SCORE ASSIGNED: 0] 4-Day Buffer Expired for ${lcaLabel} — Zero Recorded`,
              body: `Dear ${student.name},\n\nYour 4-day buffer period for ${lcaLabel} has expired without appearance. A score of 0 has now been permanently recorded in your grade profile.\n\nWARNING: If you do not report immediately to the department head, you will be formally detained on Day 5.\n\nController of Examinations, MIT-WPU`,
              status: 'delivered',
            })
          }
        }
      }

      if ((student as any)[pendingDetentionKey] && !student.detained) {
        detentionNotices++
        student.detained = true
        ;(student as any)[pendingDetentionKey] = false
        newLogs.push({
          id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp,
          recipientEmail: student.email,
          recipientName: student.name,
          rollNo: student.roll_no,
          panel: student.panel,
          type: 'detained_notice',
          subject: `[OFFICIAL DETENTION NOTICE] Debarred from Current Academic Term (${lcaLabel})`,
          body: `Dear ${student.name} (Roll: ${student.roll_no}),\n\nHaving exceeded the 10-day evaluation deadline, the 4-day final warning buffer with a 0 score recorded, and reached Day 5 of non-appearance, you are hereby officially DETAINED for the current academic session in accordance with MIT-WPU Academic Regulations.\n\nYou are not permitted to sit for term-end examinations.\n\nRegistrar & Head of Department, MIT-WPU`,
          status: 'delivered',
        })
      }
    })
  })

  saveStoredStudents(students)
  appendEmailLogs(newLogs)

  const updatedState: WorkflowState = {
    dayNumber: nextDay,
    lastRunTimestamp: timestamp,
    totalDailyRuns: prevState.totalDailyRuns + 1,
  }
  saveWorkflowState(updatedState)

  return {
    state: updatedState,
    summary: {
      attendanceEmails,
      marksEmails,
      lcaReminders,
      lcaDeadlinePassed,
      lcaBufferWarnings,
      lcaZeroAssigned,
      detentionNotices,
      totalEmails: newLogs.length,
    },
    newLogs,
  }
}

export function resetWorkflow(): void {
  const fresh = generateStudents()
  saveStoredStudents(fresh)
  saveWorkflowState({
    dayNumber: 1,
    lastRunTimestamp: new Date().toISOString(),
    totalDailyRuns: 0,
  })
}
