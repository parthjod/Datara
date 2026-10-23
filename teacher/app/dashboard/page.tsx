'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Student, ResultsState, QueryApiResponse } from '@/types'
import { fetchLiveTeacherPermissions } from '@/lib/permissions'
import { getSession, clearSession } from '@/lib/auth'
import { Topbar } from '@/components/Topbar/Topbar'
import { HowItWorks } from '@/components/HowItWorks/HowItWorks'
import { QueryBox } from '@/components/QueryBox/QueryBox'
import { ResultsTable } from '@/components/ResultsTable/ResultsTable'
import { ExportModal } from '@/components/ExportModal/ExportModal'
import { SendEmailModal } from '@/components/SendEmailModal/SendEmailModal'
import { AutomatedDefaulterPanel } from '@/components/AutomatedDefaulterPanel/AutomatedDefaulterPanel'
import { Toast } from '@/components/Toast/Toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import styles from './dashboard.module.css'

const LOADING_MESSAGES = [
  'Processing query...',
  'Validating permissions...',
  'Retrieving database records...',
  'Preparing records...',
]

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<{ email: string; name: string } | null>(null)
  const [isLiveActive, setIsLiveActive] = useState(true)
  const [query, setQuery] = useState('')
  const [resultsState, setResultsState] = useState<ResultsState>('empty')
  const [results, setResults] = useState<Partial<Student>[]>([])
  const [allResults, setAllResults] = useState<Partial<Student>[]>([])
  const [interpretation, setInterpretation] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [deniedReason, setDeniedReason] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSendEmailModal, setShowSendEmailModal] = useState(false)
  const [loadingText, setLoadingText] = useState('Processing query...')
  const [lastQuery, setLastQuery] = useState('')
  const [emailSentTimestamp, setEmailSentTimestamp] = useState<number>(0)
  const [queriedColumns, setQueriedColumns] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })



  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActiveRef = useRef<boolean>(true)

  useEffect(() => {
    const activeSession = getSession()
    if (!activeSession) {
      router.push('/login')
      return
    }
    setSessionState(activeSession)

    // Initial check on mount
    fetchLiveTeacherPermissions(activeSession.email).then((perms) => {
      setIsLiveActive(perms.active)
      lastActiveRef.current = perms.active
      if (!perms.active) {
        setDeniedReason('Your faculty account access is currently deactivated by the administrator.')
        setResultsState('denied')
      }
    })

    // 1. Supabase Realtime subscription (for Vercel / production multi-domain sync)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let realtimeChannel: any = null
    if (isSupabaseConfigured && supabase) {
      try {
        realtimeChannel = supabase
          .channel('faculty_permissions_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'faculty_permissions' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload: any) => {
              const row = payload.new
              if (row && row.email === activeSession.email) {
                const livePerms = {
                  panels: row.panels || [],
                  years: row.years || [],
                  departments: row.departments || [],
                  active: Boolean(row.active),
                }

                if (lastActiveRef.current && !livePerms.active) {
                  setIsLiveActive(false)
                  lastActiveRef.current = false
                  setDeniedReason('Your faculty account access is currently deactivated by the administrator.')
                  setResultsState('denied')
                  showToast('⚠️ Access Revoked: An administrator has deactivated your account.')
                } else if (!lastActiveRef.current && livePerms.active) {
                  setIsLiveActive(true)
                  lastActiveRef.current = true
                  setDeniedReason('')
                  setResultsState('empty')
                  showToast('✓ Access Restored: Your faculty querying access is active.')
                } else {
                  showToast('✓ Faculty permissions updated by administrator.')
                }
              }
            }
          )
          .subscribe()
      } catch {}
    }

    // 2. Local push stream listener (for local dev without polling)
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource('/api/permissions/stream')
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data && data[activeSession.email]) {
            const livePerms = data[activeSession.email]
            
            // Detect live deactivation transition
            if (lastActiveRef.current && !livePerms.active) {
              setIsLiveActive(false)
              lastActiveRef.current = false
              setDeniedReason('Your faculty account access is currently deactivated by the administrator.')
              setResultsState('denied')
              showToast('⚠️ Access Revoked: An administrator has deactivated your account.')
            } 
            // Detect live reactivation transition
            else if (!lastActiveRef.current && livePerms.active) {
              setIsLiveActive(true)
              lastActiveRef.current = true
              setDeniedReason('')
              setResultsState('empty')
              showToast('✓ Access Restored: Your faculty querying access is active.')
            } else {
              showToast('✓ Faculty permissions updated by administrator.')
            }
          }
        } catch {}
      }
    } catch {}

    // 3. BroadcastChannel for live marks sync from /update page
    let marksBc: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      marksBc = new BroadcastChannel('datara_marks_sync')
      marksBc.onmessage = (event) => {
        const updates = event.data?.updates
        if (Array.isArray(updates) && updates.length > 0) {
          const applyUpdates = (list: Partial<Student>[]) =>
            list.map((s) => {
              const match = updates.find((u: any) => u.roll_no === s.roll_no)
              return match ? { ...s, ...match } : s
            })
          setAllResults((prev) => applyUpdates(prev))
          setResults((prev) => applyUpdates(prev))
        }
      }
    }

    // 4. Supabase Realtime channel for live student marks updates
    let studentsRealtimeChannel: any = null
    if (isSupabaseConfigured && supabase) {
      try {
        studentsRealtimeChannel = supabase
          .channel('teacher_dashboard_students_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'students' },
            (payload: any) => {
              const updated = payload.new as Partial<Student>
              if (updated && updated.roll_no) {
                const applyUpdate = (list: Partial<Student>[]) =>
                  list.map((s) => (s.roll_no === updated.roll_no ? { ...s, ...updated } : s))
                setAllResults((prev) => applyUpdate(prev))
                setResults((prev) => applyUpdate(prev))
              }
            }
          )
          .subscribe()
      } catch {}
    }

    return () => {
      if (eventSource) eventSource.close()
      if (marksBc) marksBc.close()
      if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
      if (studentsRealtimeChannel && supabase) supabase.removeChannel(studentsRealtimeChannel)
    }
  }, [router])

  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 5000)
  }

  const handleFetch = async () => {
    if (!query.trim() || !session) return
    setResultsState('loading')
    setLastQuery(query)
    setLoadingText(LOADING_MESSAGES[0])

    let msgIdx = 0
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    loadingIntervalRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
      setLoadingText(LOADING_MESSAGES[msgIdx])
    }, 1200)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          teacherEmail: session.email,
        }),
      })

      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)

      if (!res.ok) {
        setResultsState('error')
        return
      }

      const data: QueryApiResponse = await res.json()

      if (!data.allowed) {
        setSqlQuery(data.sql || '')
        setDeniedReason(data.reason || 'You do not have access to that student data.')
        setResultsState('denied')
        return
      }

      const internalFields = new Set([
        'lca1_days_left',
        'lca1_buffer_left',
        'lca1_detention_pending',
        'lca2_days_left',
        'lca2_buffer_left',
        'lca2_detention_pending',
        'lca3_days_left',
        'lca3_buffer_left',
        'lca3_detention_pending',
        'updated_at',
        'id',
        'created_at',
      ])

      const detectedFields = (
        data.fields && data.fields.length > 0
          ? data.fields
          : data.rows && data.rows[0]
          ? Object.keys(data.rows[0])
          : ['roll_no', 'name', 'panel']
      ).filter((f) => !internalFields.has(f))

      setQueriedColumns(detectedFields)

      // Ensure each row strictly contains ONLY the queried columns
      let fetchedRows = (data.rows || []).map((row) => {
        const cleanRow: Record<string, unknown> = {}
        const keysToKeep =
          detectedFields.length > 0
            ? detectedFields
            : Object.keys(row).filter((k) => !internalFields.has(k))
        keysToKeep.forEach((k) => {
          cleanRow[k] = (row as any)[k]
        })
        return cleanRow as Partial<Student>
      })

      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('dq_student_marks_updates') : null
        if (stored) {
          const map = JSON.parse(stored)
          fetchedRows = fetchedRows.map((s) => {
            const roll = s.roll_no || ''
            if (map[roll]) {
              const updated = { ...s }
              for (const key of Object.keys(s)) {
                if (key in map[roll] && map[roll][key] !== undefined) {
                  (updated as any)[key] = map[roll][key]
                }
              }
              return updated
            }
            return s
          })
        }
      } catch {}

      setSqlQuery(data.sql || '')
      setAllResults(fetchedRows)
      setResults(fetchedRows.slice(0, 5))
      setInterpretation(data.interpretation || '')
      setResultsState('results')
    } catch (err) {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
      console.error(err)
      setResultsState('error')
    }
  }

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  if (!session) {
    return null
  }

  return (
    <div className={styles.page}>
      <Topbar teacherName={session.name} onLogout={handleLogout} />

      <main className={styles.content}>
        <section className={styles.section} style={{ transform: 'translateY(16px)' }}>
          <HowItWorks />
        </section>

        {/* Add or Update Marks Section */}
        <section className={styles.section} style={{ transform: 'translateY(16px)' }}>
          <div
            className={styles.updateMarksCard}
            onClick={() => router.push('/update')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.push('/update')
              }
            }}
            aria-label="Navigate to Add or Update Marks Portal"
          >
            <div className={styles.updateMarksLeft}>
              <div className={styles.updateMarksHeader}>
                <span className={styles.updateMarksIcon}>✎</span>
                <h2 className={styles.updateMarksTitle}>Add or Update Marks</h2>
                <span className={styles.updateMarksNewBadge}>Live Database Sync</span>
              </div>
              <p className={styles.updateMarksDesc}>
                Open the dedicated marks management portal. Query student cohorts (e.g. <em>"show CCA1 marks of panel D"</em> or <em>"show list of panel D students"</em>), unlock rows, edit assessments, and log updates dynamically in real-time.
              </p>
              <div className={styles.marksBadgeList}>
                <span className={styles.marksBadgeItem}>CCA 1 (/15)</span>
                <span className={styles.marksBadgeItem}>CCA 2 (/15)</span>
                <span className={styles.marksBadgeItem}>Midterm (/30)</span>
                <span className={styles.marksBadgeItem}>LCA 1 (/33)</span>
                <span className={styles.marksBadgeItem}>LCA 2 (/33)</span>
                <span className={styles.marksBadgeItem}>LCA 3 (/34)</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.updateMarksBtn}
              onClick={(e) => {
                e.stopPropagation()
                router.push('/update')
              }}
            >
              <span>Go to /update Portal</span>
              <span>→</span>
            </button>
          </div>
        </section>

        <section className={styles.section} style={{ transform: 'translateY(16px)' }}>
          {!isLiveActive && (
            <div className={styles.restrictedBanner} role="alert">
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <strong>Account Access Deactivated:</strong> An administrator has restricted your querying privileges. Database queries cannot be submitted while your account is disabled.
              </div>
            </div>
          )}

          <QueryBox
            value={query}
            onChange={setQuery}
            onFetch={handleFetch}
            loading={resultsState === 'loading'}
            disabled={!isLiveActive}
          />
        </section>

        <section className={styles.section} style={{ transform: 'translateY(16px)' }}>
          <ResultsTable
            state={resultsState}
            rows={results}
            allCount={allResults.length}
            deniedReason={deniedReason}
            loadingText={loadingText}
            onExport={() => setShowExportModal(true)}
            onSendEmail={() => setShowSendEmailModal(true)}
          />
        </section>

        <section className={styles.section} style={{ transform: 'translateY(16px)' }}>
          <AutomatedDefaulterPanel
            refreshTrigger={emailSentTimestamp}
            onRunComplete={(summary) =>
              showToast(
                `✓ Daily cycle executed: ${summary.totalEmails} automated notifications dispatched`
              )
            }
          />
        </section>
      </main>

      <ExportModal
        open={showExportModal}
        totalCount={allResults.length}
        data={allResults}
        columns={queriedColumns}
        queryText={lastQuery}
        onClose={() => {
          setShowExportModal(false)
          showToast('Dataset export processed')
        }}
        onSendEmail={() => setShowSendEmailModal(true)}
      />

      <SendEmailModal
        open={showSendEmailModal}
        data={allResults}
        queryText={lastQuery}
        onClose={() => setShowSendEmailModal(false)}
        onSuccess={(count) => {
          setEmailSentTimestamp(Date.now())
          showToast(`✓ Successfully dispatched ${count} customized defaulter notification emails!`)
        }}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )

}
