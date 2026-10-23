export interface Student {
  roll_no: string
  name: string
  email: string
  phone: string
  address: string
  aadhar: string
  dob: string
  gender: 'Male' | 'Female'
  department: string
  panel: string
  year: string
  program: string
  // Academic & Attendance Columns
  attendance: number
  cca1: number
  cca2: number
  midterm: number
  aggregate?: number
  lca1: number | null
  lca2: number | null
  lca3: number | null
  detained: boolean
  lca1_days_left?: number
  lca1_buffer_left?: number
  lca1_detention_pending?: boolean
  lca2_days_left?: number
  lca2_buffer_left?: number
  lca2_detention_pending?: boolean
  lca3_days_left?: number
  lca3_buffer_left?: number
  lca3_detention_pending?: boolean
}

export interface TeacherPermissions {
  panels: string[]
  years: string[]
  departments: string[]
  active: boolean
}

export interface PermissionsMap {
  [email: string]: TeacherPermissions
}

export interface QueryResult {
  allowed: boolean
  sql?: string
  filters?: Partial<Record<keyof Student, string | string[]>>
  fields?: (keyof Student | string)[]
  interpretation: string
  reason?: string
}

export type GeminiQueryResult = QueryResult

export interface QueryApiResponse {
  allowed: boolean
  sql?: string
  interpretation: string
  reason?: string
  rows: Partial<Student>[]
  totalCount: number
}

export type ExportFormat = 'excel' | 'pdf'
export type ResultsState = 'empty' | 'loading' | 'results' | 'error' | 'denied'

export interface SentEmail {
  id: string
  timestamp: string
  recipientEmail: string
  recipientName: string
  rollNo: string
  panel: string
  type:
    | 'attendance_defaulter'
    | 'marks_defaulter'
    | 'both_defaulters'
    | 'daily_attendance_reminder'
    | 'daily_marks_reminder'
    | 'lca_reminder'
    | 'lca_deadline_passed'
    | 'lca_buffer_warning'
    | 'lca_zero_assigned'
    | 'detained_notice'
  subject: string
  body: string
  status: 'sent' | 'delivered'
}

export interface WorkflowState {
  dayNumber: number
  lastRunTimestamp: string
  totalDailyRuns: number
}

