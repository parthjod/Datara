export interface TeacherRecord {
  email: string
  name: string
  department: string
  designation: string
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

// Merged view used in UI
export interface TeacherWithPermissions extends TeacherRecord {
  permissions: TeacherPermissions
}

export const ALL_PANELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const
export const ALL_YEARS = ['FY', 'SY', 'TY', 'B.Tech IV'] as const
export const ALL_DEPTS = ['CSE', 'CSF', 'AIML', 'IT', 'ECE', 'MECH'] as const

export type Panel = (typeof ALL_PANELS)[number]

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

