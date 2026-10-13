'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminSession, setAdminSession } from '@/lib/auth'
import styles from './login.module.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (getAdminSession()) {
      router.push('/admin')
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com'
    const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin'

    if (email.trim().toLowerCase() !== validEmail.toLowerCase() || password !== validPassword) {
      setError('Invalid admin credentials. Please verify email and password.')
      return
    }

    setIsLoading(true)
    setAdminSession()
    router.push('/admin')
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>{appName}</div>
        <div className={styles.badgeWrap}>
          <span className={styles.adminBadge}>Admin Portal</span>
        </div>
        <p className={styles.tagline}>MIT-WPU — Manage teacher access & permissions</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="admin-email">Administrator Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="admin"
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
            {isLoading ? 'Verifying...' : 'Sign In as Admin'}
          </button>
        </form>

        <p className={styles.note}>
          Authorized administrative access only · MIT World Peace University
        </p>
      </div>
    </main>
  )
}
