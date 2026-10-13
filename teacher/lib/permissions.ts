import { PermissionsMap, TeacherPermissions } from '@/types'

const KEY = process.env.NEXT_PUBLIC_PERMISSIONS_STORAGE_KEY || 'dq_teacher_permissions'

const DEFAULT_PERMISSIONS: PermissionsMap = {
  [process.env.NEXT_PUBLIC_TEACHER_EMAIL || 'pramod.mali@mitwpu.edu.in']: {
    panels: ['D', 'J'],
    years: ['TY'],
    departments: ['CSE'],
    active: true,
  }
}

export function getAllPermissions(): PermissionsMap {
  if (typeof window === 'undefined') return DEFAULT_PERMISSIONS
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : DEFAULT_PERMISSIONS
  } catch {
    return DEFAULT_PERMISSIONS
  }
}

export function getTeacherPermissions(email: string): TeacherPermissions {
  const all = getAllPermissions()
  return all[email] || { panels: ['D', 'J'], years: ['TY'], departments: ['CSE'], active: true }
}

import { supabase, isSupabaseConfigured } from './supabase'

export async function fetchLiveTeacherPermissions(email: string): Promise<TeacherPermissions> {
  // 1. Try Supabase in production/cloud if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('faculty_permissions')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (!error && data) {
        const perms: TeacherPermissions = {
          panels: data.panels || [],
          years: data.years || [],
          departments: data.departments || [],
          active: Boolean(data.active),
        }
        if (typeof window !== 'undefined') {
          const all = getAllPermissions()
          all[email] = perms
          localStorage.setItem(KEY, JSON.stringify(all))
        }
        return perms
      }
    } catch {}
  }

  // 2. Try shared backend API route (local dev)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/permissions', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') {
          localStorage.setItem(KEY, JSON.stringify(data))
          if (data[email]) return data[email]
        }
      }
    } catch {}
  }

  // 3. Fallback to localStorage / defaults
  return getTeacherPermissions(email)
}

export function saveAllPermissions(data: PermissionsMap): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}
