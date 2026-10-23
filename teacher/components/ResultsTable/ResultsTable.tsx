import React from 'react'
import { ResultsState, Student } from '@/types'
import styles from './ResultsTable.module.css'

interface ResultsTableProps {
  state: ResultsState
  rows: Partial<Student>[]
  allCount: number
  deniedReason: string
  loadingText: string
  onExport: () => void
  onSendEmail?: () => void
}

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

function formatCellValue(
  col: string,
  val: unknown,
  row?: Record<string, unknown>
): React.ReactNode {
  if (col === 'attendance' && val !== undefined && val !== null && val !== '') {
    const num = Number(val)
    if (num < 80) {
      return (
        <span className={styles.defaulterPill}>
          <span>⚠️</span> {num}% (Defaulter)
        </span>
      )
    }
    return <span className={styles.successPill}>{num}%</span>
  }

  if (col === 'cca1' && val !== undefined && val !== null && val !== '') {
    return <span>{String(val)} / 15</span>
  }
  if (col === 'cca2' && val !== undefined && val !== null && val !== '') {
    return <span>{String(val)} / 15</span>
  }
  if (col === 'midterm' && val !== undefined && val !== null && val !== '') {
    return <span>{String(val)} / 30</span>
  }

  if (col === 'aggregate') {
    let num: number
    if (
      row &&
      (row.cca1 !== undefined || row.cca2 !== undefined || row.midterm !== undefined)
    ) {
      num = (Number(row.cca1) || 0) + (Number(row.cca2) || 0) + (Number(row.midterm) || 0)
    } else if (val !== undefined && val !== null && val !== '') {
      num = Number(val)
    } else {
      num = 0
    }

    if (num < 24) {
      return (
        <span className={styles.defaulterPill}>
          <span>⚠️</span> {num}/60 (Defaulter)
        </span>
      )
    }
    return <span className={styles.successPill}>{num}/60</span>
  }

  if (col === 'lca1') {
    if (val === null || val === undefined || val === '') {
      return <span className={styles.warningPill}>Pending (Window Active)</span>
    }
    if (Number(val) === 0) {
      return <span className={styles.defaulterPill}>0 (Buffer Expired)</span>
    }
    return <span>{String(val)} / 33</span>
  }

  if (col === 'lca2') {
    if (val === null || val === undefined || val === '') {
      return <span className={styles.warningPill}>Pending (Window Active)</span>
    }
    if (Number(val) === 0) {
      return <span className={styles.defaulterPill}>0 (Buffer Expired)</span>
    }
    return <span>{String(val)} / 33</span>
  }

  if (col === 'lca3') {
    if (val === null || val === undefined || val === '') {
      return <span className={styles.warningPill}>Pending (Window Active)</span>
    }
    if (Number(val) === 0) {
      return <span className={styles.defaulterPill}>0 (Buffer Expired)</span>
    }
    return <span>{String(val)} / 34</span>
  }


  if (col === 'detained') {
    if (val === true) {
      return <span className={styles.defaulterPill}>⚠️ Detained</span>
    }
    return <span className={styles.successPill}>Regular</span>
  }

  return String(val ?? '')
}

export function ResultsTable({
  state,
  rows,
  allCount,
  deniedReason,
  loadingText,
  onExport,
  onSendEmail,
}: ResultsTableProps) {
  if (state === 'empty') {
    return (
      <div className={styles.placeholder}>
        <div className={styles.placeholderIcon}>🔍</div>
        <div className={styles.placeholderText}>Your query results will appear here</div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className={styles.loading} aria-live="polite">
        <div className={styles.spinner} />
        <div className={styles.loadingText}>{loadingText}</div>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className={styles.denied} role="alert">
        <div className={styles.deniedIcon}>⚠️</div>
        <div className={styles.deniedTitle}>Access Restricted</div>
        <div className={styles.deniedBody}>
          {deniedReason || 'You do not have access to that student data.'}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className={styles.error} role="alert">
        <div className={styles.errorTitle}>Error Encountered</div>
        <div className={styles.errorText}>
          Something went wrong while processing your request. Please try again.
        </div>
      </div>
    )
  }

  const columns = rows.length > 0 ? (Object.keys(rows[0]) as (keyof Student | string)[]) : []

  return (
    <div className={styles.resultsCard}>
      <div className={styles.resultsHeader}>
        <div className={styles.resultsTitle}>
          <span>Results</span>
          <span className={styles.countPill}>
            {allCount} {allCount === 1 ? 'student' : 'students'}
          </span>
        </div>
        <div className={styles.actionsGroup}>
          {onSendEmail && (
            <button
              type="button"
              onClick={onSendEmail}
              className={styles.emailBtn}
              aria-label="Send email notice to defaulter students"
            >
              <span>✉️</span>
              <span>Send Email</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExport}
            className={styles.exportBtn}
            aria-label="Export all results"
          >
            Export Data
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Student query results table</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col)} scope="col">
                  {formatColumnHeader(String(col))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                style={{ '--row-i': index } as React.CSSProperties}
              >
                {columns.map((col) => (
                  <td key={String(col)}>
                    {formatCellValue(
                      String(col),
                      (row as Record<string, unknown>)[String(col)],
                      row as Record<string, unknown>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allCount > 5 && (
        <div className={styles.more}>
          + {allCount - 5} more students · Export to see all data
        </div>
      )}
    </div>
  )
}

