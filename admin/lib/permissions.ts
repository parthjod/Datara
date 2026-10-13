import { PermissionsMap, TeacherPermissions, TeacherRecord } from '@/types'

const KEY = process.env.NEXT_PUBLIC_PERMISSIONS_STORAGE_KEY || 'dq_teacher_permissions'

/*
 * SYNC MECHANISM
 * ==============
 * Both the admin app and the teacher dashboard app share the same
 * localStorage key defined in NEXT_PUBLIC_PERMISSIONS_STORAGE_KEY.
 *
 * Admin writes:
 *   localStorage.setItem(KEY, JSON.stringify(permissionsMap))
 *
 * Teacher dashboard reads:
 *   localStorage.getItem(KEY) → on every Fetch button click
 *
 * This means permission changes made in the admin panel take effect
 * immediately — the teacher doesn't need to log out or refresh.
 * Their next query will use the latest permissions.
 *
 * IMPORTANT: For localStorage to be shared, both apps must be served
 * from the same origin (protocol + domain + port).
 * e.g. both on http://localhost:3000 (use different ports if running
 * simultaneously: :3000 for teacher, :3001 for admin).
 *
 * If deployed, both must share the same domain, or use a shared
 * backend (database) instead of localStorage for production.
 */

// Static teacher roster — names and metadata only, not permissions
export const TEACHER_ROSTER: TeacherRecord[] = [
  {
    email: 'pramod.mali@mitwpu.edu.in',
    name: 'Prof. Pramod Mali',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
  },
  {
    email: 'sneha.kulkarni@mitwpu.edu.in',
    name: 'Prof. Sneha Kulkarni',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
  },
  {
    email: 'rahul.deshmukh@mitwpu.edu.in',
    name: 'Prof. Rahul Deshmukh',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
  },
]

// Default permissions seeded on first run
const DEFAULT_PERMISSIONS: PermissionsMap = {
  'pramod.mali@mitwpu.edu.in': { panels: ['D', 'J'], years: ['TY'], departments: ['CSE'], active: true },
  'sneha.kulkarni@mitwpu.edu.in': { panels: ['A', 'B', 'C'], years: ['TY', 'SY'], departments: ['CSE'], active: true },
  'rahul.deshmukh@mitwpu.edu.in': { panels: ['E', 'F', 'G', 'H'], years: ['TY'], departments: ['CSE'], active: true },
}

export function getAllPermissions(): PermissionsMap {
  if (typeof window === 'undefined') return DEFAULT_PERMISSIONS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // First run — seed defaults
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_PERMISSIONS))
      return DEFAULT_PERMISSIONS
    }
    return JSON.parse(raw) as PermissionsMap
  } catch {
    return DEFAULT_PERMISSIONS
  }
}

import { supabase, isSupabaseConfigured } from './supabase'

export function saveAllPermissions(data: PermissionsMap): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))

  // 1. Sync to Supabase in production/cloud if configured
  if (isSupabaseConfigured && supabase) {
    const rows = Object.entries(data).map(([email, p]) => ({
      email,
      panels: p.panels,
      years: p.years,
      departments: p.departments,
      active: p.active,
      updated_at: new Date().toISOString(),
    }))
    Promise.resolve(supabase.from('faculty_permissions').upsert(rows))
      .then(({ error }: any) => {
        if (error) console.warn('Supabase upsert warning:', error.message)
      })
      .catch(() => {})
  }

  // 2. Persist to shared backend file via local API route (local dev)
  fetch('/api/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})

  // 3. Push directly to teacher dashboard API on port 3000 for instant live cross-origin reflection
  fetch('http://localhost:3000/api/permissions', {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

export async function fetchSupabasePermissions(): Promise<PermissionsMap | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase.from('faculty_permissions').select('*')
    if (error || !data) return null
    const map: PermissionsMap = {}
    data.forEach((row: any) => {
      map[row.email] = {
        panels: row.panels || [],
        years: row.years || [],
        departments: row.departments || [],
        active: Boolean(row.active),
      }
    })
    return map
  } catch {
    return null
  }
}

export function getTeacherPermissions(email: string): TeacherPermissions {
  const all = getAllPermissions()
  return all[email] || { panels: [], years: ['TY'], departments: ['CSE'], active: true }
}

export function saveTeacherPermissions(email: string, perms: TeacherPermissions): void {
  const all = getAllPermissions()
  all[email] = perms
  saveAllPermissions(all)
}

export function addTeacher(teacher: TeacherRecord, initialPanels: string[]): void {
  // Add to permissions map (roster is managed via React state / localStorage)
  const all = getAllPermissions()
  all[teacher.email] = {
    panels: initialPanels,
    years: ['TY'],
    departments: ['CSE'],
    active: true,
  }
  saveAllPermissions(all)
}
