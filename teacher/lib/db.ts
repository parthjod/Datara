import { newDb, IMemoryDb } from 'pg-mem'
import { STUDENTS } from './students'
import { Student } from '@/types'

let dbInstance: IMemoryDb | null = null

export function getDatabase(): IMemoryDb {
  if (dbInstance) return dbInstance

  const db = newDb()

  // Create students table
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
      program text
    );
  `)

  function esc(val: string | undefined): string {
    if (val === undefined || val === null) return "''"
    return `'${String(val).replace(/'/g, "''")}'`
  }

  // Bulk insert the 660 students in batches
  const chunkSize = 100
  for (let i = 0; i < STUDENTS.length; i += chunkSize) {
    const chunk = STUDENTS.slice(i, i + chunkSize)
    const values = chunk
      .map(
        (s) =>
          `(${esc(s.roll_no)}, ${esc(s.name)}, ${esc(s.email)}, ${esc(s.phone)}, ${esc(s.address)}, ${esc(s.aadhar)}, ${esc(s.dob)}, ${esc(s.gender)}, ${esc(s.department)}, ${esc(s.panel)}, ${esc(s.year)}, ${esc(s.program)})`
      )
      .join(',\n')

    db.public.none(`
      INSERT INTO students (
        roll_no, name, email, phone, address, aadhar, dob, gender, department, panel, year, program
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
