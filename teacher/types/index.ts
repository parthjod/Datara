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
  fields?: (keyof Student)[]
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
