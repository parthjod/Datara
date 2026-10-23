'use client'

import React, { useState, useEffect } from 'react'
import { Student, SentEmail, WorkflowState, ALL_PANELS } from '@/types'
import styles from './DefaultersMonitor.module.css'

interface DefaultersMonitorProps {
  onNotify: (msg: string) => void
}

export function DefaultersMonitor({ onNotify }: DefaultersMonitorProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'logs'>('roster')
  const [selectedPanel, setSelectedPanel] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'attendance' | 'marks' | 'lca' | 'detained'
  >('all')
  const [search, setSearch] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [runningCycle, setRunningCycle] = useState(false)
  const [resetting, setResetting] = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [metrics, setMetrics] = useState({
    total: 0,
    attendanceDefaulters: 0,
    marksDefaulters: 0,
    lcaDefaulters: 0,
    detained: 0,
  })

  const [emailLogs, setEmailLogs] = useState<SentEmail[]>([])
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    dayNumber: 1,
    lastRunTimestamp: new Date().toISOString(),
    totalDailyRuns: 0,
  })

  const [selectedLog, setSelectedLog] = useState<SentEmail | null>(null)

  // Fetch students
  const loadStudents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedPanel !== 'ALL') params.set('panel', selectedPanel)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/students?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        if (data.metrics) setMetrics(data.metrics)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs and state
  const loadLogsAndState = async () => {
    try {
      const res = await fetch('/api/email/logs')
      if (res.ok) {
        const data = await res.json()
        if (data.logs) setEmailLogs(data.logs)
        if (data.state) setWorkflowState(data.state)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [selectedPanel, selectedCategory, search])

  useEffect(() => {
    loadLogsAndState()
  }, [])

  const handleRunDaily = async () => {
    if (runningCycle) return
    setRunningCycle(true)
    try {
      const res = await fetch('/api/automation/daily-run', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.state) setWorkflowState(data.state)
        loadStudents()
        loadLogsAndState()
        onNotify(
          `✓ Daily cycle executed: ${data.summary?.totalEmails || 0} automated emails dispatched`
        )
      }
    } catch (err) {
      console.error(err)
      onNotify('Failed to execute daily automation run')
    } finally {
      setRunningCycle(false)
    }
  }

  const handleReset = async () => {
    if (resetting) return
    if (!confirm('Reset entire student dataset and simulation back to Day 1?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/automation/reset', { method: 'POST' })
      if (res.ok) {
        loadStudents()
        loadLogsAndState()
        onNotify('✓ Simulation reset to Day 1 with fresh dummy dataset')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setResetting(false)
    }
  }

  const getAgg = (s: Student): number => {
    if (s.aggregate !== undefined) return s.aggregate
    return s.cca1 + s.cca2 + s.midterm
  }

  return (
    <div className={styles.container}>
      {/* 1. Executive KPI Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Enrolled Students</span>
          <span className={styles.kpiVal}>{metrics.total}</span>
          <span className={styles.kpiSub}>Across Panels A to K (TY CSE)</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Attendance Defaulters</span>
          <span className={styles.kpiVal}>{metrics.attendanceDefaulters}</span>
          <span className={styles.kpiSub}>Attendance &lt; 80% (Mandatory minimum)</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <span className={styles.kpiLabel}>Academic Defaulters</span>
          <span className={styles.kpiVal}>{metrics.marksDefaulters}</span>
          <span className={styles.kpiSub}>CCA1 + CCA2 + Midterm &lt; 24 / 60</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>LCA Inactive / Expired</span>
          <span className={styles.kpiVal}>{metrics.lcaDefaulters}</span>
          <span className={styles.kpiSub}>Pending submission or Buffer active</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Detained Students</span>
          <span className={styles.kpiVal}>{metrics.detained}</span>
          <span className={styles.kpiSub}>Day 5 post-warning non-appearance</span>
        </div>
      </div>

      {/* 2. Policy Thresholds & Automated Workflow Console */}
      <div className={styles.policyCard}>
        <div className={styles.policyHeader}>
          <h2 className={styles.policyTitle}>
            <span>⚙️</span>
            <span>Academic Defaulter & Evaluation Rules Engine</span>
          </h2>
          <span className={styles.cycleBadge}>Cycle: Day {workflowState.dayNumber}</span>
        </div>

        <div className={styles.policyRules}>
          <div className={styles.policyItem}>
            <span className={styles.policyItemTitle}>Attendance Threshold</span>
            <span className={styles.policyItemVal}>Minimum 80.0%</span>
            <span className={styles.policyItemSub}>
              Students below 80% flagged as defaulters and receive daily reminders
            </span>
          </div>

          <div className={styles.policyItem}>
            <span className={styles.policyItemTitle}>Passing Internal Aggregate</span>
            <span className={styles.policyItemVal}>Minimum 24 / 60 Marks</span>
            <span className={styles.policyItemSub}>
              CCA-1 (15) + CCA-2 (15) + Midterm (30) aggregate passing bar
            </span>
          </div>

          <div className={styles.policyItem}>
            <span className={styles.policyItemTitle}>LCA Evaluation Window</span>
            <span className={styles.policyItemVal}>10-Day Countdown Period</span>
            <span className={styles.policyItemSub}>
              Daily reminder intimation sent to students until window expires
            </span>
          </div>

          <div className={styles.policyItem}>
            <span className={styles.policyItemTitle}>Buffer Grace & Detention</span>
            <span className={styles.policyItemVal}>4-Day Buffer → Day 5 Debarred</span>
            <span className={styles.policyItemSub}>
              Day 4 of buffer assigns 0 mark; non-appearance on Day 5 triggers detention
            </span>
          </div>
        </div>

        <div className={styles.actionRow}>
          <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
            Daily automated email dispatcher runs across all students every 24 hours.
          </span>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleReset}
              disabled={resetting || runningCycle}
            >
              ↺ Reset to Day 1
            </button>
            <button
              type="button"
              className={styles.runBtn}
              onClick={handleRunDaily}
              disabled={runningCycle}
            >
              <span>⚡</span>
              <span>{runningCycle ? 'Executing Cycle...' : 'Run Daily Cycle (+1 Day)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Data Card: Switcher between Directory and Email Dispatch Log */}
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <div className={styles.tabSwitcher}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'roster' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Students Defaulters Directory ({students.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab('logs')
                loadLogsAndState()
              }}
            >
              Automated Email Dispatch Log ({emailLogs.length})
            </button>
          </div>
        </div>

        {activeTab === 'roster' ? (
          <>
            {/* Filter Bar */}
            <div className={styles.filterBar}>
              <div className={styles.filterRow}>
                <div className={styles.chipGroup}>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedCategory === 'all' ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    All Records
                  </button>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedCategory === 'attendance' ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory('attendance')}
                  >
                    Attendance Defaulters (&lt;80%)
                  </button>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedCategory === 'marks' ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory('marks')}
                  >
                    Marks Defaulters (&lt;24/60)
                  </button>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedCategory === 'lca' ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory('lca')}
                  >
                    LCA Incomplete / Expired
                  </button>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedCategory === 'detained' ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory('detained')}
                  >
                    Detained Students
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search name, roll, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Panel Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
                  Panel:
                </span>
                <button
                  type="button"
                  className={`${styles.panelChip} ${selectedPanel === 'ALL' ? styles.panelChipActive : ''}`}
                  onClick={() => setSelectedPanel('ALL')}
                >
                  All Panels
                </button>
                {ALL_PANELS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.panelChip} ${selectedPanel === p ? styles.panelChipActive : ''}`}
                    onClick={() => setSelectedPanel(p)}
                  >
                    Panel {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Table */}
            <div className={styles.tableWrap}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading student database records...
                </div>
              ) : students.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  No students found matching the selected filters.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Panel</th>
                      <th>Attendance</th>
                      <th>CCA-1 (/15)</th>
                      <th>CCA-2 (/15)</th>
                      <th>Midterm (/30)</th>
                      <th>Aggregate (/60)</th>
                      <th>LCA-1 (/33)</th>
                      <th>LCA-2 (/33)</th>
                      <th>LCA-3 (/34)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const agg = getAgg(s)
                      return (
                        <tr key={s.roll_no}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.roll_no}</td>
                          <td>
                            <div>{s.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{s.email}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{s.panel}</span>
                          </td>
                          <td>
                            {s.attendance < 80 ? (
                              <span className={styles.pillDanger}>⚠️ {s.attendance}%</span>
                            ) : (
                              <span className={styles.pillSuccess}>{s.attendance}%</span>
                            )}
                          </td>
                          <td>{s.cca1} / 15</td>
                          <td>{s.cca2} / 15</td>
                          <td>{s.midterm} / 30</td>
                          <td>
                            {agg < 24 ? (
                              <span className={styles.pillDanger}>⚠️ {agg}/60</span>
                            ) : (
                              <span className={styles.pillSuccess}>{agg}/60</span>
                            )}
                          </td>
                          <td>
                            {s.lca1 === null ? (
                              <span className={styles.pillWarning}>
                                Pending ({s.lca1_days_left ?? 10}d)
                              </span>
                            ) : s.lca1 === 0 ? (
                              <span className={styles.pillDanger}>0 (Expired)</span>
                            ) : (
                              `${s.lca1}/33`
                            )}
                          </td>
                          <td>
                            {s.lca2 === null ? (
                              <span className={styles.pillWarning}>
                                Pending ({s.lca2_days_left ?? 10}d)
                              </span>
                            ) : s.lca2 === 0 ? (
                              <span className={styles.pillDanger}>0 (Expired)</span>
                            ) : (
                              `${s.lca2}/33`
                            )}
                          </td>
                          <td>
                            {s.lca3 === null ? (
                              <span className={styles.pillWarning}>
                                Pending ({s.lca3_days_left ?? 10}d)
                              </span>
                            ) : s.lca3 === 0 ? (
                              <span className={styles.pillDanger}>0 (Expired)</span>
                            ) : (
                              `${s.lca3}/34`
                            )}
                          </td>
                          <td>
                            {s.detained ? (
                              <span className={styles.pillDetained}>⚠️ Detained</span>
                            ) : (
                              <span className={styles.pillSuccess}>Regular</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          /* Email Dispatch Log View */
          <div className={styles.logTableWrap}>
            {emailLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                No email dispatch logs recorded yet.
              </div>
            ) : (
              <table className={styles.logTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Category</th>
                    <th>Recipient</th>
                    <th>Roll / Panel</th>
                    <th>Subject</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.76rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span
                          className={
                            log.type.includes('detained')
                              ? styles.pillDetained
                              : log.type.includes('attendance')
                              ? styles.pillDanger
                              : log.type.includes('marks')
                              ? styles.pillWarning
                              : styles.pillSuccess
                          }
                        >
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div>{log.recipientName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                          {log.recipientEmail}
                        </div>
                      </td>
                      <td>
                        {log.rollNo} ({log.panel})
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.subject}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.resetBtn}
                          onClick={() => setSelectedLog(log)}
                        >
                          View Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Selected Email Log Preview Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 11, 12, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontSize: '1.3rem' }}>
                Dispatched Email Notice
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ fontSize: '1.2rem', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              <div>
                <strong>To:</strong> {selectedLog.recipientName} ({selectedLog.recipientEmail})
              </div>
              <div>
                <strong>Roll:</strong> {selectedLog.rollNo} · Panel: {selectedLog.panel}
              </div>
              <div>
                <strong>Subject:</strong> {selectedLog.subject}
              </div>
              <div>
                <strong>Sent:</strong> {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
              </div>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                maxHeight: '260px',
                overflowY: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {selectedLog.body}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                className={styles.runBtn}
                onClick={() => setSelectedLog(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
