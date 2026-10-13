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
}

export function ResultsTable({
  state,
  rows,
  allCount,
  deniedReason,
  loadingText,
  onExport,
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

  const columns = rows.length > 0 ? (Object.keys(rows[0]) as (keyof Student)[]) : []

  return (
    <div className={styles.resultsCard}>
      <div className={styles.resultsHeader}>
        <div className={styles.resultsTitle}>
          <span>Results</span>
          <span className={styles.countPill}>
            {allCount} {allCount === 1 ? 'student' : 'students'}
          </span>
        </div>
        <button
          type="button"
          onClick={onExport}
          className={styles.exportBtn}
          aria-label="Export all results"
        >
          Export Data
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Student query results table</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">
                  {col.replace('_', ' ')}
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
                  <td key={col}>{String(row[col] ?? '')}</td>
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
