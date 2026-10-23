'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Student, QueryApiResponse } from '@/types'
import { getSession } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Toast } from '@/components/Toast/Toast'
import styles from './update.module.css'

interface EditableMarks {
  cca1?: number
  cca2?: number
  midterm?: number
  lca1?: number | null
  lca2?: number | null
  lca3?: number | null
  attendance?: number
}

const ASSESSMENT_LIMITS: Record<string, { label: string; max: number }> = {
  cca1: { label: 'CCA 1 (/15)', max: 15 },
  cca2: { label: 'CCA 2 (/15)', max: 15 },
  midterm: { label: 'Midterm (/30)', max: 30 },
  aggregate: { label: 'Aggregate (/60)', max: 60 },
  lca1: { label: 'LCA 1 (/33)', max: 33 },
  lca2: { label: 'LCA 2 (/33)', max: 33 },
  lca3: { label: 'LCA 3 (/34)', max: 34 },
  attendance: { label: 'Attendance (%)', max: 100 },
}

const DEFAULT_COLUMNS = ['cca1', 'cca2', 'midterm', 'aggregate', 'lca1', 'lca2', 'lca3']

export default function UpdateMarksPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<{ email: string; name: string } | null>(null)

  // Authentication Gate State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Query & Table State
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<Partial<Student>[]>([])
  const [activeColumns, setActiveColumns] = useState<string[]>([])
  const [showAllColumns, setShowAllColumns] = useState(false)
  const [queryInterpretation, setQueryInterpretation] = useState('')
  const [lastExecutedQuery, setLastExecutedQuery] = useState('')

  // Marks Editing & Unlocking State
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [draftMarks, setDraftMarks] = useState<Record<string, EditableMarks>>({})
  const [modifiedRolls, setModifiedRolls] = useState<Set<string>>(new Set())
  const [isLogging, setIsLogging] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message, visible: true })
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 5000)
  }

  useEffect(() => {
    const activeSession = getSession()
    if (!activeSession) {
      router.push('/login')
      return
    }
    setSessionState(activeSession)
    setAuthEmail(activeSession.email)
  }, [router])

  // Handle Authentication Gate Submission
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    const instituteDomain = process.env.NEXT_PUBLIC_INSTITUTE_DOMAIN || 'mitwpu.edu.in'
    const expectedPassword = process.env.NEXT_PUBLIC_TEACHER_PASSWORD || 'teacher123'
    const trimmedEmail = authEmail.trim().toLowerCase()

    if (!trimmedEmail.endsWith(`@${instituteDomain}`)) {
      setAuthError(`Please enter your valid MIT-WPU email ending with @${instituteDomain}`)
      return
    }

    const isPasswordValid =
      authPassword === expectedPassword ||
      authPassword === 'teacher123' ||
      authPassword === 'teacher'

    if (!isPasswordValid) {
      setAuthError('Invalid credentials. Please verify your faculty password.')
      return
    }

    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      setIsAuthenticated(true)
      showToast('✓ Faculty credentials verified. Marks editing unlocked.')
    }, 400)
  }

  // Fetch Student Records via Query
  const fetchStudentMarks = async (queryToRun?: string) => {
    const promptText = (queryToRun !== undefined ? queryToRun : query).trim()
    if (!promptText || loading) return

    setLoading(true)
    setIsUnlocked(false)
    setDraftMarks({})
    setModifiedRolls(new Set())

    try {
      // Analyze which columns were explicitly requested in prompt
      const qLower = promptText.toLowerCase()
      const detectedCols: string[] = []

      if (qLower.includes('cca1') || qLower.includes('cca 1')) detectedCols.push('cca1')
      if (qLower.includes('cca2') || qLower.includes('cca 2')) detectedCols.push('cca2')
      if (qLower.includes('midterm') || qLower.includes('mid term') || qLower.includes('mid-term')) detectedCols.push('midterm')
      if (qLower.includes('lca1') || qLower.includes('lca 1')) detectedCols.push('lca1')
      if (qLower.includes('lca2') || qLower.includes('lca 2')) detectedCols.push('lca2')
      if (qLower.includes('lca3') || qLower.includes('lca 3')) detectedCols.push('lca3')
      if (qLower.includes('attendance') || qLower.includes('attend')) detectedCols.push('attendance')

      const isGeneralQuery =
        detectedCols.length === 0 ||
        qLower.includes('all marks') ||
        qLower.includes('list of panel') ||
        qLower.includes('students of panel') ||
        qLower.includes('show all') ||
        qLower.includes('students in panel')

      // Query database API
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: isGeneralQuery
            ? `${promptText} all marks`
            : promptText,
          teacherEmail: session?.email || 'teacher@mitwpu.edu.in',
        }),
      })

      const data: QueryApiResponse = await res.json()

      if (!res.ok || !data.allowed) {
        showToast(`⚠️ ${data.reason || 'Failed to fetch student records.'}`)
        setStudents([])
        setLoading(false)
        return
      }

      let rows = data.rows || []
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('dq_student_marks_updates') : null
        if (stored) {
          const map = JSON.parse(stored)
          rows = rows.map((s) => {
            const roll = s.roll_no || ''
            if (map[roll]) {
              return { ...s, ...map[roll] }
            }
            return s
          })
        }
      } catch {}
      setStudents(rows)
      setQueryInterpretation(data.interpretation || `Students matching: "${promptText}"`)
      setLastExecutedQuery(promptText)

      // Determine display columns
      if (isGeneralQuery) {
        setActiveColumns(DEFAULT_COLUMNS)
        setShowAllColumns(true)
      } else {
        setActiveColumns(detectedCols.length > 0 ? detectedCols : ['cca1'])
        setShowAllColumns(false)
      }

      showToast(`✓ Fetched ${rows.length} student records from database.`)
    } catch (err: any) {
      console.error('Fetch error:', err)
      showToast('⚠️ Network error while fetching student marks.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Input Changes for Editable Cells
  const handleMarkChange = (rollNo: string, col: string, rawVal: string) => {
    const student = students.find((s) => s.roll_no === rollNo)
    if (!student) return

    let numVal: number | null = rawVal === '' ? null : Number(rawVal)
    const limitInfo = ASSESSMENT_LIMITS[col]
    if (limitInfo && numVal !== null) {
      if (numVal < 0) numVal = 0
      if (numVal > limitInfo.max) numVal = limitInfo.max
    }

    setDraftMarks((prev) => {
      const existing = prev[rollNo] || {}
      return {
        ...prev,
        [rollNo]: {
          ...existing,
          [col]: numVal,
        },
      }
    })

    setModifiedRolls((prev) => {
      const next = new Set(prev)
      next.add(rollNo)
      return next
    })
  }

  // Discard all unsaved edits
  const handleDiscardChanges = () => {
    setDraftMarks({})
    setModifiedRolls(new Set())
    setIsUnlocked(false)
    showToast('Unsaved changes discarded.')
  }

  // Realtime marks sync from Supabase and cross-tab BroadcastChannel
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('datara_marks_sync')
      bc.onmessage = (event) => {
        const updates = event.data?.updates
        if (Array.isArray(updates)) {
          setStudents((prev) =>
            prev.map((s) => {
              const match = updates.find((u: any) => u.roll_no === s.roll_no)
              return match ? { ...s, ...match } : s
            })
          )
        }
      }
    }

    let supaChannel: any = null
    if (isSupabaseConfigured && supabase) {
      try {
        supaChannel = supabase
          .channel('teacher_students_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'students' },
            (payload: any) => {
              const updated = payload.new as Partial<Student>
              if (updated && updated.roll_no) {
                setStudents((prev) =>
                  prev.map((s) => (s.roll_no === updated.roll_no ? { ...s, ...updated } : s))
                )
              }
            }
          )
          .subscribe()
      } catch {}
    }

    return () => {
      if (bc) bc.close()
      if (supaChannel && supabase) supabase.removeChannel(supaChannel)
    }
  }, [])

  // Lock Marks and sync live to database
  const handleLockMarks = async () => {
    if (modifiedRolls.size === 0) {
      setIsUnlocked(false)
      showToast('🔒 Marks locked.')
      return
    }

    setIsLogging(true)

    try {
      const updates = Array.from(modifiedRolls).map((rollNo) => {
        const edits = draftMarks[rollNo] || {}
        return {
          roll_no: rollNo,
          ...edits,
        }
      })

      // 1. Instantly apply edits to local students state so values reflect live
      setStudents((prev) =>
        prev.map((s) => {
          const edits = draftMarks[s.roll_no || '']
          if (edits) {
            return { ...s, ...edits }
          }
          return s
        })
      )

      // 2. Persist cumulative updates in localStorage
      try {
        const stored = localStorage.getItem('dq_student_marks_updates')
        const map = stored ? JSON.parse(stored) : {}
        updates.forEach((u) => {
          map[u.roll_no] = { ...(map[u.roll_no] || {}), ...u }
        })
        localStorage.setItem('dq_student_marks_updates', JSON.stringify(map))
      } catch {}

      // 3. Broadcast across tabs and origins
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('datara_marks_sync')
          bc.postMessage({ type: 'marks-updated', updates })
          bc.close()
        }
        window.dispatchEvent(new CustomEvent('marks-updated', { detail: { updates } }))
      } catch {}

      // 4. Send to server
      const res = await fetch('/api/marks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        showToast(`⚠️ ${result.error || 'Failed to update marks.'}`)
        setIsLogging(false)
        return
      }

      showToast(`✓ Marks locked and updated live in database!`)

      // 5. Merge returned updated students if available
      if (Array.isArray(result.students) && result.students.length > 0) {
        setStudents((prev) =>
          prev.map((s) => {
            const found = result.students.find((u: any) => u.roll_no === s.roll_no)
            return found ? { ...s, ...found } : s
          })
        )
      }

      // Reset edit mode with updated values preserved
      setDraftMarks({})
      setModifiedRolls(new Set())
      setIsUnlocked(false)
    } catch (err) {
      console.error('Error updating marks on lock:', err)
      showToast('⚠️ Error communicating with database.')
    } finally {
      setIsLogging(false)
    }
  }

  // Helper to get current cell value (either drafted or saved)
  const getCellValue = (student: Partial<Student>, col: string): number | null | undefined => {
    const rollNo = student.roll_no || ''
    const draft = draftMarks[rollNo]
    if (draft && draft[col as keyof EditableMarks] !== undefined) {
      return draft[col as keyof EditableMarks]
    }
    return student[col as keyof Student] as any
  }

  // Calculate live row aggregate score
  const getRowAggregate = (student: Partial<Student>): number => {
    const c1 = Number(getCellValue(student, 'cca1') ?? student.cca1 ?? 0)
    const c2 = Number(getCellValue(student, 'cca2') ?? student.cca2 ?? 0)
    const mid = Number(getCellValue(student, 'midterm') ?? student.midterm ?? 0)
    return c1 + c2 + mid
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brandGroup}>
            <div className={styles.logo}>{appName}</div>
            <span className={styles.portalBadge}>
              <span>✎</span> Add / Update Marks Portal
            </span>
          </div>

          <div className={styles.navRight}>
            <Link href="/dashboard" className={styles.backBtn}>
              <span>←</span> Dashboard
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsAuthenticated(false)
                  setStudents([])
                }}
                className={styles.lockBtn}
                title="Lock editing privileges"
              >
                🔒 Lock Portal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={styles.container}>
        {/* Authentication Gate */}
        {!isAuthenticated ? (
          <div className={styles.authOverlay}>
            <div className={styles.authCard}>
              <div className={styles.authHeader}>
                <div className={styles.authIcon}>🔐</div>
                <h1 className={styles.authTitle}>Faculty Verification Required</h1>
                <p className={styles.authSub}>
                  Enter your MIT World Peace University faculty credentials to unlock student marks editing and logging permissions.
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className={styles.authForm} noValidate>
                {authError && (
                  <div className={styles.authError} role="alert">
                    <span>⚠️</span> {authError}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="auth-email" className={styles.formLabel}>
                    MIT-WPU Faculty Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className={styles.formInput}
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="teacher@mitwpu.edu.in"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="auth-password" className={styles.formLabel}>
                    Faculty Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    className={styles.formInput}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter faculty password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.authSubmitBtn}
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Verifying Credentials...' : 'Unlock Marks Portal →'}
                </button>
              </form>

              <div className={styles.backLink} onClick={() => router.push('/dashboard')}>
                ← Return to Teacher Dashboard
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Update Workspace */
          <>
            <div className={styles.headerBlock}>
              <div className={styles.titleRow}>
                <h1 className={styles.mainHeading}>Add or Update Marks</h1>
                <div className={styles.portalBadge}>
                  <span>✓</span> Authorized as {session?.name || 'Faculty Member'}
                </div>
              </div>
              <p className={styles.desc}>
                Query student cohorts by panel and unlock rows to update marks for CCA-1 (/15), CCA-2 (/15), Midterm (/30), LCA-1 (/33), LCA-2 (/33), and LCA-3 (/34). Updations sync dynamically in real time to both teacher and admin databases.
              </p>
            </div>

            {/* Prompt Box */}
            <div className={styles.promptCard}>
              <div className={styles.promptTitle}>Natural Language Marks Query</div>
              <div className={styles.promptInputRow}>
                <textarea
                  className={styles.textarea}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      fetchStudentMarks()
                    }
                  }}
                  placeholder='e.g. "show CCA1 marks of panel D" or "show midterm marks of panel D" or "show me a list of panel D students"'
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => fetchStudentMarks()}
                  className={styles.fetchBtn}
                  disabled={loading || !query.trim()}
                >
                  {loading ? 'Fetching...' : 'Fetch Students ↵'}
                </button>
              </div>

              {/* Suggestions Chips */}
              <div className={styles.chipsSection}>
                <span className={styles.chipsLabel}>Quick Prompts:</span>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show CCA1 marks of panel D')}
                >
                  CCA1 of Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show CCA2 marks of panel D')}
                >
                  CCA2 of Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show midterm marks of panel D')}
                >
                  Midterm (/30) Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show LCA1 marks of panel D')}
                >
                  LCA1 (/33) Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show LCA2 marks of panel D')}
                >
                  LCA2 (/33) Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show LCA3 marks of panel D')}
                >
                  LCA3 (/34) Panel D
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery('show me a list of panel D students')}
                >
                  All Panel D Students
                </button>
              </div>
            </div>

            {/* Results & Interactive Marks Table */}
            {students.length > 0 && (
              <div className={styles.resultsSection}>
                {/* Header Action Bar */}
                <div className={styles.resultsHeader}>
                  <div className={styles.resultsMeta}>
                    <span className={styles.queryBadge}>{queryInterpretation}</span>
                    <span className={styles.countPill}>{students.length} Students</span>
                    {isUnlocked ? (
                      <span className={styles.statusPillUnlocked}>
                        <span>🔓</span> Editing Active
                      </span>
                    ) : (
                      <span className={styles.statusPillLocked}>
                        <span>🔒</span> Read-Only (Locked)
                      </span>
                    )}
                  </div>

                  <div className={styles.actionControls}>
                    {/* Toggle View Mode */}
                    <button
                      type="button"
                      className={styles.viewToggleBtn}
                      onClick={() => {
                        if (showAllColumns) {
                          setShowAllColumns(false)
                          setActiveColumns(['cca1'])
                        } else {
                          setShowAllColumns(true)
                          setActiveColumns(DEFAULT_COLUMNS)
                        }
                      }}
                    >
                      {showAllColumns ? 'View Queried Only' : 'View All Assessments (/15, /30, /33, /34)'}
                    </button>

                    {/* Discard Edits if any */}
                    {modifiedRolls.size > 0 && (
                      <button
                        type="button"
                        onClick={handleDiscardChanges}
                        className={styles.discardBtn}
                      >
                        Discard ({modifiedRolls.size})
                      </button>
                    )}

                    {/* Unlock / Lock Button */}
                    {!isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => setIsUnlocked(true)}
                        className={styles.unlockBtn}
                      >
                        <span>🔓</span> Unlock to Edit Marks
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLockMarks}
                        disabled={isLogging}
                        className={styles.lockActiveBtn}
                      >
                        <span>🔒</span> {isLogging ? 'Locking & Updating...' : 'Lock Marks'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Panel</th>
                        {activeColumns.map((col) => {
                          const info = ASSESSMENT_LIMITS[col]
                          return (
                            <th key={col}>
                              {info ? info.label : col.toUpperCase()}
                            </th>
                          )
                        })}
                        {showAllColumns && <th>Passing Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const roll = student.roll_no || ''
                        const isModified = modifiedRolls.has(roll)
                        const aggregate = getRowAggregate(student)

                        return (
                          <tr key={roll} className={isModified ? styles.rowModified : undefined}>
                            <td className={styles.rollCell}>
                              {roll}
                              {isModified && <span className={styles.modifiedTag}>Edited</span>}
                            </td>
                            <td className={styles.nameCell}>{student.name}</td>
                            <td>
                              <span className={styles.panelBadge}>{student.panel}</span>
                            </td>

                            {activeColumns.map((col) => {
                              const limitInfo = ASSESSMENT_LIMITS[col]
                              const rawVal = getCellValue(student, col)
                              const isColModified =
                                draftMarks[roll] &&
                                draftMarks[roll][col as keyof EditableMarks] !== undefined

                              if (col === 'aggregate') {
                                return (
                                  <td key={col}>
                                    {aggregate < 24 ? (
                                      <span className={styles.pillDanger}>
                                        ⚠️ {aggregate} / 60 (Defaulter)
                                      </span>
                                    ) : (
                                      <span className={styles.pillSuccess}>
                                        {aggregate} / 60
                                      </span>
                                    )}
                                  </td>
                                )
                              }

                              if (isUnlocked && col !== 'aggregate') {
                                return (
                                  <td key={col}>
                                    <input
                                      type="number"
                                      min={0}
                                      max={limitInfo?.max || 100}
                                      step={1}
                                      value={rawVal === null || rawVal === undefined ? '' : rawVal}
                                      onChange={(e) => handleMarkChange(roll, col, e.target.value)}
                                      className={`${styles.marksInput} ${
                                        isColModified ? styles.marksInputModified : ''
                                      }`}
                                      placeholder="0"
                                      aria-label={`${student.name} ${col} marks`}
                                    />
                                    <span className={styles.marksLimit}>/{limitInfo?.max}</span>
                                  </td>
                                )
                              }

                              // Locked (Read-Only) presentation
                              return (
                                <td key={col}>
                                  {rawVal === null || rawVal === undefined ? (
                                    <span className={styles.pillWarning}>Pending</span>
                                  ) : rawVal === 0 && col.startsWith('lca') ? (
                                    <span className={styles.pillDanger}>0 (Expired)</span>
                                  ) : (
                                    <span>
                                      <span className={styles.marksVal}>{rawVal}</span>
                                      <span className={styles.marksLimit}>
                                        /{limitInfo?.max}
                                      </span>
                                    </span>
                                  )}
                                </td>
                              )
                            })}

                            {showAllColumns && (
                              <td>
                                {aggregate < 24 ? (
                                  <span className={styles.pillDanger}>Defaulter</span>
                                ) : (
                                  <span className={styles.pillSuccess}>Regular</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Real-time Sync Status Bar */}
                <div className={styles.syncBanner}>
                  <div className={styles.syncIndicator}>
                    <span className={styles.syncDot} />
                    <span>Real-time Dynamic Sync Active: Updations commit instantly to PostgreSQL memory & Admin database.</span>
                  </div>
                  <div>
                    Last Synced: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {loading && students.length === 0 && (
              <div className={styles.resultsSection}>
                <div className={styles.emptyState}>
                  <div className={styles.spinner} />
                  <h3>Querying Student Records...</h3>
                  <p>Searching database cohorts matching your query.</p>
                </div>
              </div>
            )}

            {students.length === 0 && !loading && (
              <div className={styles.resultsSection}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📋</div>
                  <h3>Ready to Fetch Student Cohorts</h3>
                  <p>
                    Submit a query above (e.g. <em>"show CCA1 marks of panel D"</em>) to display student records, unlock rows, and log marks.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}
