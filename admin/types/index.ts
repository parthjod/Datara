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
