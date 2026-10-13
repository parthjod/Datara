export function getSession(): { email: string; name: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('dq_teacher_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(email: string): void {
  const parts = email.split('@')[0].split('.')
  const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  sessionStorage.setItem('dq_teacher_session', JSON.stringify({ email, name: `Prof. ${name}` }))
}

export function clearSession(): void {
  sessionStorage.removeItem('dq_teacher_session')
}
