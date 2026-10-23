import { newDb, IMemoryDb } from 'pg-mem'
import { getStoredStudents } from './students_store'
import { Student } from '@/types'

let dbInstance: IMemoryDb | null = null

export function reloadDatabase(): IMemoryDb {
  dbInstance = null
  return getDatabase()
}

export function getDatabase(): IMemoryDb {
  if (dbInstance) return dbInstance

  const db = newDb()

  // Create students table with academic and attendance columns
  db.public.none(`
    CREATE TABLE students (
      roll_no text,
      name text,
      email text,
      phone text,
      address text,
      aadhar text,
      dob text,
      gender text,
      department text,
      panel text,
      year text,
      program text,
      attendance numeric,
      cca1 numeric,
      cca2 numeric,
      midterm numeric,
      lca1 numeric,
      lca2 numeric,
      lca3 numeric,
      detained boolean,
      lca1_days_left numeric,
      lca1_buffer_left numeric,
      lca2_days_left numeric,
      lca2_buffer_left numeric,
      lca3_days_left numeric,
      lca3_buffer_left numeric
    );
  `)

  function esc(val: unknown): string {
    if (val === undefined || val === null) return 'NULL'
    if (typeof val === 'number') return String(val)
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
    return `'${String(val).replace(/'/g, "''")}'`
  }

  const studentsList = getStoredStudents()

  // Bulk insert students in batches
  const chunkSize = 100
  for (let i = 0; i < studentsList.length; i += chunkSize) {
    const chunk = studentsList.slice(i, i + chunkSize)
    const values = chunk
      .map(
        (s) =>
          `(${esc(s.roll_no)}, ${esc(s.name)}, ${esc(s.email)}, ${esc(s.phone)}, ${esc(s.address)}, ${esc(s.aadhar)}, ${esc(s.dob)}, ${esc(s.gender)}, ${esc(s.department)}, ${esc(s.panel)}, ${esc(s.year)}, ${esc(s.program)}, ${esc(s.attendance)}, ${esc(s.cca1)}, ${esc(s.cca2)}, ${esc(s.midterm)}, ${esc(s.lca1)}, ${esc(s.lca2)}, ${esc(s.lca3)}, ${esc(s.detained)}, ${esc(s.lca1_days_left)}, ${esc(s.lca1_buffer_left)}, ${esc(s.lca2_days_left)}, ${esc(s.lca2_buffer_left)}, ${esc(s.lca3_days_left)}, ${esc(s.lca3_buffer_left)})`
      )
      .join(',\n')

    db.public.none(`
      INSERT INTO students (
        roll_no, name, email, phone, address, aadhar, dob, gender, department, panel, year, program,
        attendance, cca1, cca2, midterm, lca1, lca2, lca3, detained,
        lca1_days_left, lca1_buffer_left, lca2_days_left, lca2_buffer_left, lca3_days_left, lca3_buffer_left
      ) VALUES ${values};
    `)
  }

  dbInstance = db
  return dbInstance
}

export function executePostgresQuery(sqlQuery: string): Partial<Student>[] {
  const db = getDatabase()
  const trimmed = sqlQuery.trim().replace(/;+$/, '')

  if (!trimmed.toLowerCase().startsWith('select')) {
    throw new Error('Security policy violation: Only SELECT queries are permitted.')
  }

  try {
    const results = db.public.many(trimmed)
    return results as Partial<Student>[]
  } catch (err) {
    console.error('Postgres execution error:', err)
    throw new Error(`PostgreSQL execution error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

