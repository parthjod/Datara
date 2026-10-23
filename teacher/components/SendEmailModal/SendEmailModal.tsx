'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
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

function formatColumnHeader(col: string): string {
  if (col === 'cca1') return 'CCA 1 (/15)'
  if (col === 'cca2') return 'CCA 2 (/15)'
  if (col === 'midterm') return 'Midterm (/30)'
  if (col === 'aggregate') return 'Aggregate (/60)'
  if (col === 'attendance') return 'Attendance'
  if (col === 'lca1') return 'LCA 1 (/33)'
  if (col === 'lca2') return 'LCA 2 (/33)'
  if (col === 'lca3') return 'LCA 3 (/34)'
  if (col === 'detained') return 'Academic Status'
  return col.replace(/_/g, ' ')
}

function formatCellValue(col: string, val: unknown): React.ReactNode {
  if (val === undefined || val === null || val === '') return '—'

  if (col === 'attendance') {
    const num = Number(val)
    if (num < 80) {
      return (
        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
          ⚠️ {num}%
        </span>
      )
    }
    return <span style={{ color: 'var(--success)', fontWeight: 600 }}>{num}%</span>
  }

  if (col === 'cca1') return <span>{String(val)} / 15</span>
  if (col === 'cca2') return <span>{String(val)} / 15</span>
  if (col === 'midterm') return <span>{String(val)} / 30</span>

  if (col === 'aggregate') {
    const num = Number(val)
    if (num < 24) {
      return (
        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
          ⚠️ {num}/60
        </span>
      )
    }
    return <span style={{ color: 'var(--success)', fontWeight: 600 }}>{num}/60</span>
  }

  if (col === 'lca1') {
    if (Number(val) === 0) return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>0 (Buffer Expired)</span>
    return <span>{String(val)} / 33</span>
  }
  if (col === 'lca2') {
    if (Number(val) === 0) return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>0 (Buffer Expired)</span>
    return <span>{String(val)} / 33</span>
  }
  if (col === 'lca3') {
    if (Number(val) === 0) return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>0 (Buffer Expired)</span>
    return <span>{String(val)} / 34</span>
  }

  if (col === 'detained') {
    return val === true ? (
      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Detained</span>
    ) : (
      <span style={{ color: 'var(--success)', fontWeight: 600 }}>Regular</span>
    )
  }

  return String(val)
}

export function SendEmailModal({
  open,
  data,
  queryText,
  onClose,
  onSuccess,
}: SendEmailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview')
  const [customNoticeText, setCustomNoticeText] = useState<string>('')
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false)

  // Check which columns were actually returned by the teacher query
  const columns = data.length > 0 ? (Object.keys(data[0]) as (keyof Student | string)[]) : []
  const hasAttendance = data.some((s) => s.attendance !== undefined && s.attendance !== null)
  const hasAggregate = data.some(
    (s) =>
      (s.aggregate !== undefined && s.aggregate !== null) ||
      (s.cca1 !== undefined && s.cca2 !== undefined && s.midterm !== undefined)
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      if (hasAttendance || hasAggregate) {
        setFilter('all_defaulters')
      } else {
        setFilter('all')
      }
      setHasManuallyEdited(false)
    }
  }, [open, hasAttendance, hasAggregate])


  // Defaulter checks only evaluated if relevant columns were queried
  const isAttDef = (s: Partial<Student>): boolean =>
    hasAttendance && s.attendance !== undefined && Number(s.attendance) < 80

  const isMarksDef = (s: Partial<Student>): boolean => {
    if (!hasAggregate) return false
    if (s.cca1 !== undefined || s.cca2 !== undefined || s.midterm !== undefined) {
      return (Number(s.cca1) || 0) + (Number(s.cca2) || 0) + (Number(s.midterm) || 0) < 24
    }
    if (s.aggregate !== undefined && s.aggregate !== null) return Number(s.aggregate) < 24
    return false
  }

  const isDefaulter = (s: Partial<Student>): boolean => isAttDef(s) || isMarksDef(s)

  // Segmenting counts
  const attDefCount = hasAttendance ? data.filter(isAttDef).length : 0
  const marksDefCount = hasAggregate ? data.filter(isMarksDef).length : 0
  const allDefCount = hasAttendance || hasAggregate ? data.filter(isDefaulter).length : 0

  // Filter recipients according to selected category
  let recipients: Partial<Student>[] = []
  if (filter === 'all_defaulters') {
    recipients = allDefCount > 0 ? data.filter(isDefaulter) : [...data]
  } else if (filter === 'attendance' && hasAttendance) {
    recipients = data.filter(isAttDef)
  } else if (filter === 'marks' && hasAggregate) {
    recipients = data.filter(isMarksDef)
  } else {
    recipients = [...data]
  }

  // Sample student for live preview
  const sampleStudent = recipients[0] || data[0] || {}
  const sampleAtt = sampleStudent.attendance
  const sampleCca1 = sampleStudent.cca1
  const sampleCca2 = sampleStudent.cca2
  const sampleMid = sampleStudent.midterm

  const generatedTemplate = useMemo(() => {
    let previewSubject = ''
    let previewContent = ''

    if (filter === 'attendance' || (isAttDef(sampleStudent) && !isMarksDef(sampleStudent))) {
      previewSubject = `URGENT: Low Attendance Warning (${sampleAtt}% recorded) — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official academic notice from MIT World Peace University.\n\nYour current attendance is recorded at ${sampleAtt}%, which does not satisfy the mandatory university requirement of 80% attendance.\n\nYou are currently placed on the Departmental Defaulters List. Continued failure to maintain regular attendance will lead to examination debarment. Please resume attending all scheduled lectures immediately.\n\nDepartment of Computer Science & Engineering,\nMIT-WPU, Pune`
    } else if (filter === 'marks' || (!isAttDef(sampleStudent) && isMarksDef(sampleStudent))) {
      const aggScore =
        sampleCca1 !== undefined || sampleCca2 !== undefined || sampleMid !== undefined
          ? (Number(sampleCca1) || 0) + (Number(sampleCca2) || 0) + (Number(sampleMid) || 0)
          : sampleStudent.aggregate ?? 'Below 24'
      previewSubject = `ACADEMIC DEFICIENCY NOTICE: Internal Assessment Aggregate Below 24/60 (${aggScore}/60) — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official intimation regarding your continuous evaluation performance:\n• CCA-1 Score: ${sampleCca1 !== undefined ? `${sampleCca1} / 15` : 'N/A'}\n• CCA-2 Score: ${sampleCca2 !== undefined ? `${sampleCca2} / 15` : 'N/A'}\n• Mid-Term Examination: ${sampleMid !== undefined ? `${sampleMid} / 30` : 'N/A'}\n• Cumulative Aggregate: ${aggScore} / 60\n\nYour internal aggregate falls below the mandatory passing benchmark of 24/60. You are required to meet with your course instructor immediately for academic remediation.\n\nExamination Cell,\nMIT-WPU, Pune`
    } else if (isAttDef(sampleStudent) && isMarksDef(sampleStudent)) {
      previewSubject = `CRITICAL NOTICE: Departmental Defaulter Status Intimation — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official intimation that you are currently listed on the MIT-WPU Defaulters List for the current semester:\n• Current Attendance: ${sampleAtt}% (Required: ≥ 80%)\n• Internal Assessment: Deficiency flagged\n\nPlease report to your department mentor and panel coordinator immediately to address these deficiencies.\n\nAcademic Monitoring Committee,\nMIT-WPU, Pune`
    } else if (sampleCca1 !== undefined && !hasAggregate && !hasAttendance) {
      // Specific CCA-1 assessment notice
      previewSubject = `ACADEMIC NOTICE: CCA-1 Evaluation Recorded — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official intimation regarding your Continuous Assessment evaluation at MIT World Peace University:\n• CCA-1 Score: ${sampleCca1} / 15\n\nPlease review your recorded evaluation in your student portal. For any queries or clarifications, consult your course faculty.\n\nDepartment of Computer Science & Engineering,\nMIT-WPU, Pune`
    } else if (sampleCca2 !== undefined && !hasAggregate && !hasAttendance) {
      // Specific CCA-2 assessment notice
      previewSubject = `ACADEMIC NOTICE: CCA-2 Evaluation Recorded — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official intimation regarding your Continuous Assessment evaluation at MIT World Peace University:\n• CCA-2 Score: ${sampleCca2} / 15\n\nPlease review your recorded evaluation in your student portal. For any queries or clarifications, consult your course faculty.\n\nDepartment of Computer Science & Engineering,\nMIT-WPU, Pune`
    } else if (sampleMid !== undefined && !hasAggregate && !hasAttendance) {
      // Specific Midterm assessment notice
      previewSubject = `ACADEMIC NOTICE: Mid-Term Examination Score Recorded — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official intimation regarding your Mid-Term examination performance at MIT World Peace University:\n• Mid-Term Examination: ${sampleMid} / 30\n\nPlease review your recorded evaluation in your student portal. For any queries or clarifications, consult your course faculty.\n\nExamination Cell,\nMIT-WPU, Pune`
    } else {
      // General student notification
      previewSubject = `ACADEMIC NOTICE: Departmental Student Communication — MIT-WPU`
      previewContent = `Dear ${sampleStudent.name || '[Student Name]'} (Roll: ${sampleStudent.roll_no || '[Roll No]'}, Panel ${sampleStudent.panel || '[Panel]'}),\n\nThis is an official communication from the School of Computer Science & Engineering, MIT World Peace University.\n\nPlease review your latest course updates and academic evaluation details in your student portal.\n\nDepartment of Computer Science & Engineering,\nMIT-WPU, Pune`
    }

    return { previewSubject, previewContent }
  }, [
    filter,
    sampleStudent,
    sampleAtt,
    sampleCca1,
    sampleCca2,
    sampleMid,
    hasAggregate,
    hasAttendance,
  ])

  useEffect(() => {
    if (!hasManuallyEdited) {
      setCustomNoticeText(generatedTemplate.previewContent)
    }
  }, [generatedTemplate.previewContent, hasManuallyEdited])

  const handleSend = async () => {
    if (recipients.length === 0 || sending) return
    setSending(true)

    const finalBody =
      customNoticeText !== undefined && customNoticeText.trim() !== ''
        ? customNoticeText
        : generatedTemplate.previewContent

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: filter,
          recipients,
          customSubject: generatedTemplate.previewSubject,
          customBody: finalBody,
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

  if (!open) return null

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
              <span className={styles.cardLabel}>Queried Students</span>
              <span className={styles.cardVal}>{data.length}</span>
            </div>
            {hasAttendance && (
              <div className={styles.summaryCard}>
                <span className={styles.cardLabel}>Attendance Defaulters</span>
                <span className={styles.cardVal}>{attDefCount}</span>
              </div>
            )}
            {hasAggregate && (
              <div className={styles.summaryCard}>
                <span className={styles.cardLabel}>Marks Defaulters</span>
                <span className={styles.cardVal}>{marksDefCount}</span>
              </div>
            )}
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Selected Recipients</span>
              <span className={styles.cardVal}>{recipients.length}</span>
            </div>
          </div>

          {/* Filter Segment (shown when defaulter categories exist) */}
          {(hasAttendance || hasAggregate) && (
            <div>
              <div className={styles.filterTabs}>
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'all_defaulters' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('all_defaulters')}
                >
                  All Defaulters ({allDefCount > 0 ? allDefCount : data.length})
                </button>
                {hasAttendance && (
                  <button
                    type="button"
                    className={`${styles.filterTab} ${filter === 'attendance' ? styles.filterTabActive : ''}`}
                    onClick={() => setFilter('attendance')}
                  >
                    Attendance Below 80% ({attDefCount})
                  </button>
                )}
                {hasAggregate && (
                  <button
                    type="button"
                    className={`${styles.filterTab} ${filter === 'marks' ? styles.filterTabActive : ''}`}
                    onClick={() => setFilter('marks')}
                  >
                    Aggregate Below 24/60 ({marksDefCount})
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All Query Results ({data.length})
                </button>
              </div>
            </div>
          )}

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
              <div className={styles.previewSubject}>{generatedTemplate.previewSubject}</div>
              <textarea
                className={styles.previewContent}
                value={customNoticeText}
                onChange={(e) => {
                  setHasManuallyEdited(true)
                  setCustomNoticeText(e.target.value)
                }}
                rows={9}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className={styles.recipientListWrap}>
              <table className={styles.recipientTable}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={String(col)}>{formatColumnHeader(String(col))}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((s, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td key={String(col)}>
                          {formatCellValue(String(col), s[col as keyof Student])}
                        </td>
                      ))}
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

