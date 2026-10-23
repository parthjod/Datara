'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Student } from '@/types'
import styles from './SendEmailModal.module.css'

interface SendEmailModalProps {
  open: boolean
  data: Partial<Student>[]
  queryText: string
  onClose: () => void
  onSuccess: (sentCount: number) => void
}

type FilterCategory = 'all_defaulters' | 'attendance' | 'marks' | 'all'

export function SendEmailModal({
  open,
  data,
  queryText,
  onClose,
  onSuccess,
}: SendEmailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilterCategory>('all_defaulters')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview')

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Helper checks
  const getAgg = (s: Partial<Student>): number => {
    if (s.aggregate !== undefined) return Number(s.aggregate)
    const c1 = Number(s.cca1 ?? 0)
    const c2 = Number(s.cca2 ?? 0)
    const mid = Number(s.midterm ?? 0)
    return c1 + c2 + mid
  }

  const isAttDef = (s: Partial<Student>): boolean =>
    s.attendance !== undefined && Number(s.attendance) < 80

  const isMarksDef = (s: Partial<Student>): boolean =>
    (s.cca1 !== undefined || s.aggregate !== undefined) && getAgg(s) < 24

  const isDefaulter = (s: Partial<Student>): boolean => isAttDef(s) || isMarksDef(s)

  // Segmenting counts
  const attDefCount = data.filter(isAttDef).length
  const marksDefCount = data.filter(isMarksDef).length
  const allDefCount = data.filter(isDefaulter).length

  // Filter recipients according to selected category
  let recipients: Partial<Student>[] = []
  if (filter === 'all_defaulters') {
    recipients = data.filter(isDefaulter)
    // If none match strict defaulter criteria, fall back to all data
    if (recipients.length === 0) recipients = [...data]
  } else if (filter === 'attendance') {
    recipients = data.filter(isAttDef)
  } else if (filter === 'marks') {
    recipients = data.filter(isMarksDef)
  } else {
    recipients = [...data]
  }

  // Sample student for live preview
  const sampleStudent = recipients[0] || data[0] || {}
  const sampleAtt = sampleStudent.attendance ?? 72.4
  const sampleCca1 = sampleStudent.cca1 ?? 6
  const sampleCca2 = sampleStudent.cca2 ?? 5
  const sampleMid = sampleStudent.midterm ?? 8
  const sampleAgg = getAgg(sampleStudent) || 19

  let previewSubject = ''
  let previewContent = ''

  if (filter === 'attendance' || (isAttDef(sampleStudent) && !isMarksDef(sampleStudent))) {
    previewSubject = `URGENT: Low Attendance Defaulter Warning (${sampleAtt}% recorded) — MIT-WPU`
    previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),

This is an official academic notice from MIT World Peace University.

Your current attendance is recorded at ${sampleAtt}%, which does not satisfy the mandatory university requirement of 80% attendance.

You are currently placed on the Departmental Defaulters List. Continued failure to maintain regular attendance will lead to examination debarment. Please resume attending all scheduled lectures immediately.

Department of Computer Science & Engineering,
MIT-WPU, Pune`
  } else if (filter === 'marks' || (!isAttDef(sampleStudent) && isMarksDef(sampleStudent))) {
    previewSubject = `ACADEMIC DEFICIENCY NOTICE: Internal Assessment Aggregate Below 24/60 (${sampleAgg}/60) — MIT-WPU`
    previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),

This is an official intimation regarding your continuous evaluation performance:
• CCA-1 Score: ${sampleCca1} / 15
• CCA-2 Score: ${sampleCca2} / 15
• Mid-Term Examination: ${sampleMid} / 30
• Cumulative Aggregate: ${sampleAgg} / 60

Your internal aggregate is ${sampleAgg}/60, which falls below the mandatory passing benchmark of 24/60. You are required to meet with your course instructor immediately for academic remediation.

Examination Cell,
MIT-WPU, Pune`
  } else {
    // Dual or general defaulter notice
    previewSubject = `CRITICAL NOTICE: Departmental Defaulter Status Intimation — MIT-WPU`
    previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),

This is an official intimation that you are currently listed on the MIT-WPU Defaulters List for the current semester:
• Current Attendance: ${sampleAtt}% (Required: ≥ 80%)
• Internal Evaluation Aggregate: ${sampleAgg}/60 (Benchmark: ≥ 24/60)

Please report to your department mentor and panel coordinator immediately to address these deficiencies.

Academic Monitoring Committee,
MIT-WPU, Pune`
  }

  const handleSend = async () => {
    if (recipients.length === 0 || sending) return
    setSending(true)

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: filter,
          recipients,
          customSubject: previewSubject,
          customBody: previewContent,
        }),
      })

      if (!res.ok) throw new Error('Failed to send notification emails')

      const result = await res.json()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('email-dispatched', { detail: { count: result.count } })
        )
      }
      onSuccess(result.count || recipients.length)
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to dispatch notification emails. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-title"
    >
      <div className={styles.modal} ref={modalRef} tabIndex={-1}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="send-email-title" className={styles.title}>
            <span>✉️</span>
            <span>Dispatch Defaulter Email Notices</span>
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close send email dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Summary Cards */}
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Attendance Defaulters</span>
              <span className={styles.cardVal}>{attDefCount}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Marks Defaulters</span>
              <span className={styles.cardVal}>{marksDefCount}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Total Defaulters</span>
              <span className={styles.cardVal}>{allDefCount}</span>
            </div>
          </div>

          {/* Filter Segment */}
          <div>
            <div className={styles.filterTabs}>
              <button
                type="button"
                className={`${styles.filterTab} ${filter === 'all_defaulters' ? styles.filterTabActive : ''}`}
                onClick={() => setFilter('all_defaulters')}
              >
                All Defaulters ({allDefCount > 0 ? allDefCount : data.length})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${filter === 'attendance' ? styles.filterTabActive : ''}`}
                onClick={() => setFilter('attendance')}
              >
                Attendance Below 80% ({attDefCount})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${filter === 'marks' ? styles.filterTabActive : ''}`}
                onClick={() => setFilter('marks')}
              >
                Aggregate Below 24/60 ({marksDefCount})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                onClick={() => setFilter('all')}
              >
                All Query Results ({data.length})
              </button>
            </div>
          </div>

          {/* View Mode Toggle: Preview vs Roster */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`${styles.filterTab} ${activeTab === 'preview' ? styles.filterTabActive : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Template Preview
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${activeTab === 'recipients' ? styles.filterTabActive : ''}`}
              onClick={() => setActiveTab('recipients')}
            >
              Recipient Roster ({recipients.length})
            </button>
          </div>

          {activeTab === 'preview' ? (
            <div className={styles.previewBox}>
              <div className={styles.previewHeader}>Customized Live Preview</div>
              <div className={styles.previewSubject}>{previewSubject}</div>
              <div className={styles.previewContent}>{previewContent}</div>
            </div>
          ) : (
            <div className={styles.recipientListWrap}>
              <table className={styles.recipientTable}>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Panel</th>
                    <th>Attendance</th>
                    <th>Aggregate</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.roll_no || 'N/A'}</td>
                      <td>{s.name || 'Student'}</td>
                      <td>{s.panel || 'N/A'}</td>
                      <td>
                        {s.attendance !== undefined ? (
                          <span
                            style={{
                              color: Number(s.attendance) < 80 ? 'var(--danger)' : 'var(--success)',
                              fontWeight: 600,
                            }}
                          >
                            {s.attendance}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {s.cca1 !== undefined || s.aggregate !== undefined ? (
                          <span
                            style={{
                              color: getAgg(s) < 24 ? 'var(--danger)' : 'var(--success)',
                              fontWeight: 600,
                            }}
                          >
                            {getAgg(s)}/60
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={recipients.length === 0 || sending}
          >
            {sending ? (
              <>
                <div className={styles.spinner} />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <span>✉️</span>
                <span>Send {recipients.length} Notification Emails</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
