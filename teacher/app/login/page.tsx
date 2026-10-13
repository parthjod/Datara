'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, setSession } from '@/lib/auth'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (getSession()) {
      router.push('/dashboard')
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const instituteDomain = process.env.NEXT_PUBLIC_INSTITUTE_DOMAIN || 'mitwpu.edu.in'
    const expectedEmail = process.env.NEXT_PUBLIC_TEACHER_EMAIL || 'pramod.mali@mitwpu.edu.in'
    const expectedPassword = process.env.NEXT_PUBLIC_TEACHER_PASSWORD || 'pramodsir11'

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail.endsWith(`@${instituteDomain}`)) {
      setError(`Please use your university email ending with @${instituteDomain}`)
      return
    }

    if (trimmedEmail !== expectedEmail.toLowerCase() || password !== expectedPassword) {
      setError('Invalid email or password. Please verify your credentials.')
      return
    }

    setIsLoading(true)
    setSession(trimmedEmail)
    router.push('/dashboard')
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>{appName}</div>
        <p className={styles.tagline}>Teacher Data Query Portal · MIT-WPU</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="teacher-email">Faculty Email</label>
            <input
              id="teacher-email"
              type="email"
              autoComplete="email"
              required
              placeholder="pramod.mali@mitwpu.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="teacher-password">Password</label>
            <input
              id="teacher-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.note}>
          Restricted to authorized faculty members of MIT World Peace University
        </p>
      </div>
    </main>
  )
}
