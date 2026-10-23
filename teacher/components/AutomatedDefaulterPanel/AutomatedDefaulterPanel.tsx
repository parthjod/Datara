'use client'

import React, { useState, useEffect } from 'react'
import { SentEmail, WorkflowState } from '@/types'
import styles from './AutomatedDefaulterPanel.module.css'

interface AutomatedDefaulterPanelProps {
  onRunComplete?: (summary: Record<string, number>) => void
  refreshTrigger?: number | string
}

export function AutomatedDefaulterPanel({ onRunComplete, refreshTrigger }: AutomatedDefaulterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [state, setState] = useState<WorkflowState>({
    dayNumber: 1,
    lastRunTimestamp: new Date().toISOString(),
    totalDailyRuns: 0,
  })
  const [recentLogs, setRecentLogs] = useState<SentEmail[]>([])
  const [lastSummary, setLastSummary] = useState<Record<string, number> | null>(null)

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/automation/daily-run')
      if (res.ok) {
        const data = await res.json()
        if (data.state) setState(data.state)
        if (data.logs) setRecentLogs(data.logs.slice(0, 20))
      }
    } catch {}
  }

  useEffect(() => {
    loadStatus()

    const handleEmailDispatched = () => {
      loadStatus()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('email-dispatched', handleEmailDispatched)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('email-dispatched', handleEmailDispatched)
      }
    }
  }, [refreshTrigger])

  const handleRunDaily = async () => {
    if (running) return
    setRunning(true)
    try {
      const res = await fetch('/api/automation/daily-run', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setState(data.state)
        setLastSummary(data.summary)
        setRecentLogs(data.recentLogs ? data.recentLogs.slice(0, 20) : [])
        onRunComplete?.(data.summary)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  const handleReset = async () => {
    if (resetting) return
    if (!confirm('Reset simulation back to Day 1 with fresh dummy student data?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/automation/reset', { method: 'POST' })
      if (res.ok) {
        setState({
          dayNumber: 1,
          lastRunTimestamp: new Date().toISOString(),
          totalDailyRuns: 0,
        })
        setLastSummary(null)
        setRecentLogs([])
        loadStatus()
        alert('Simulation reset to Day 1.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setResetting(false)
    }
  }

  const getBadgeClass = (type: SentEmail['type']): string => {
    if (type.includes('attendance')) return styles.badgeAttendance
    if (type.includes('marks')) return styles.badgeMarks
    if (type.includes('both')) return styles.badgeBoth
    if (type.includes('detained')) return styles.badgeDetained
    return styles.badgeLca
  }

  const formatTypeLabel = (type: SentEmail['type']): string => {
    if (type === 'daily_attendance_reminder') return 'Daily Attendance'
    if (type === 'daily_marks_reminder') return 'Daily Marks'
    if (type === 'attendance_defaulter') return 'Attendance Defaulter'
    if (type === 'marks_defaulter') return 'Academic Defaulter'
    if (type === 'both_defaulters') return 'Dual Defaulter'
    if (type === 'lca_reminder') return 'LCA Countdown'
    if (type === 'lca_deadline_passed') return 'LCA Day 10 Passed'
    if (type === 'lca_buffer_warning') return 'LCA Buffer Warning'
    if (type === 'lca_zero_assigned') return 'LCA Mark 0'
    if (type === 'detained_notice') return 'Detention Notice'
    return 'Defaulter Notice'
  }

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <span className={styles.headerTitle}>
          <span>⚡</span>
          <span>Automated Daily Defaulter & LCA Policy Engine</span>
          <span className={styles.dayBadge}>Cycle Day {state.dayNumber}</span>
        </span>
        <span className={styles.toggleBtn}>
          {isOpen ? 'Minimize' : 'Expand Controls & Logs'}
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▾</span>
        </span>
      </div>

      {isOpen && (
        <div className={styles.body}>
          {/* Rules Summary Grid */}
          <div className={styles.rulesGrid}>
            <div className={styles.ruleBox}>
              <div className={styles.ruleBoxTitle}>
                <span>📅</span>
                <span>Attendance Defaulters</span>
              </div>
              <div className={styles.ruleBoxDesc}>
                Students with attendance below <strong>80%</strong> automatically receive a daily reminder intimation to resume regular class attendance.
              </div>
            </div>

            <div className={styles.ruleBox}>
              <div className={styles.ruleBoxTitle}>
                <span>📊</span>
                <span>Academic Defaulters</span>
              </div>
              <div className={styles.ruleBoxDesc}>
                Students with CCA1 + CCA2 + Midterm aggregate below <strong>24 / 60</strong> receive daily deficiency warnings.
              </div>
            </div>

            <div className={styles.ruleBox}>
              <div className={styles.ruleBoxTitle}>
                <span>⏳</span>
                <span>LCA 1, 2, 3 Countdown</span>
              </div>
              <div className={styles.ruleBoxDesc}>
                <strong>10-day window:</strong> Daily reminder.<br />
                <strong>Day 10 passed:</strong> 4-day buffer.<br />
                <strong>Day 4 of buffer:</strong> Score 0 assigned.<br />
                <strong>Day 5 post-warning:</strong> Student officially detained.
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className={styles.actionBar}>
            <div className={styles.actionStatus}>
              Simulation Active: <strong>Day {state.dayNumber}</strong> · Total Cycles Executed: <strong>{state.totalDailyRuns}</strong>
              {lastSummary && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--success)' }}>
                  (Last Run: {lastSummary.totalEmails} automated emails dispatched)
                </span>
              )}
            </div>

            <div className={styles.btnGroup}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleReset}
                disabled={resetting || running}
              >
                ↺ Reset to Day 1
              </button>
              <button
                type="button"
                className={styles.runBtn}
                onClick={handleRunDaily}
                disabled={running}
              >
                <span>⚡</span>
                <span>{running ? 'Processing Cycle...' : 'Run Daily Cycle (+1 Day)'}</span>
              </button>
            </div>
          </div>

          {/* Recent Emails Feed */}
          <div>
            <div className={styles.feedTitle}>
              <span>Recent Automated Dispatch Feed</span>
              {recentLogs.length > 0 && (
                <span className={styles.feedCountBadge}>
                  {Math.min(20, recentLogs.length)} Most Recent
                </span>
              )}
            </div>
            <div className={styles.feedList}>
              {recentLogs.length === 0 ? (
                <div style={{ padding: '1.25rem', color: 'var(--muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                  No automated or manual emails dispatched yet. Send emails via &quot;Send Email&quot; or click &quot;Run Daily Cycle (+1 Day)&quot;.
                </div>
              ) : (
                recentLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className={styles.feedItem}>
                    <div className={styles.feedMeta}>
                      <span className={styles.feedSubject}>{log.subject}</span>
                      <span className={styles.feedRecipient}>
                        <strong>To:</strong> {log.recipientEmail}
                        {log.recipientName && log.recipientName !== 'Student' && (
                          <span> ({log.recipientName})</span>
                        )}
                        {log.rollNo && log.rollNo !== 'N/A' && (
                          <span> · Roll: {log.rollNo}</span>
                        )}
                        {log.panel && log.panel !== 'N/A' && (
                          <span> (Panel {log.panel})</span>
                        )}
                        {log.timestamp && (
                          <span className={styles.feedTime}>
                            {' '}· {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`${styles.feedBadge} ${getBadgeClass(log.type)}`}>
                      {formatTypeLabel(log.type)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
