export function getAdminSession(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('dq_admin_session') === 'true'
}

export function setAdminSession(): void {
  sessionStorage.setItem('dq_admin_session', 'true')
}

export function clearAdminSession(): void {
  sessionStorage.removeItem('dq_admin_session')
}
