import React from 'react'
import styles from './QueryBox.module.css'

interface QueryBoxProps {
  value: string
  onChange: (v: string) => void
  onFetch: () => void
  loading: boolean
  disabled?: boolean
}

export function QueryBox({ value, onChange, onFetch, loading, disabled }: QueryBoxProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!loading && !disabled && value.trim()) {
        onFetch()
      }
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Natural Language Query</h2>
      <textarea
        className={styles.textarea}
        placeholder={
          disabled
            ? 'Account disabled by administrator. Queries cannot be submitted.'
            : 'e.g. Show me a list of defaulter students, Defaulter by attendance, Defaulter by marks, or TY CSE students in panel D...'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading || disabled}
        aria-label="Student data query prompt"
      />

      {!disabled && (
        <div className={styles.chipRow}>
          <span className={styles.chipLabel}>Quick Defaulter Queries:</span>
          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => onChange('Show me a list of defaulter students')}
            disabled={loading}
          >
            📋 All Defaulters
          </button>
          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => onChange('Defaulter by attendance')}
            disabled={loading}
          >
            ⚠️ Attendance &lt; 80%
          </button>
          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => onChange('Defaulter by marks')}
            disabled={loading}
          >
            📉 Marks Aggregate &lt; 24/60
          </button>
          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => onChange('Show students who missed LCA assessment')}
            disabled={loading}
          >
            ⏳ Missed LCA Assessments
          </button>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.hint}>
          {disabled ? (
            <span style={{ color: 'var(--danger)' }}>
              ⚠️ Your account is currently disabled by administrator.
            </span>
          ) : (
            <>
              Press <strong>Fetch Data</strong> or <strong>Ctrl + Enter</strong>. Queries automatically adhere to your assigned panel permissions.
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onFetch}
          disabled={loading || disabled || !value.trim()}
          className={styles.fetchBtn}
        >
          {disabled ? 'Access Restricted' : loading ? 'Processing...' : 'Fetch Data'}
        </button>
      </div>
    </div>
  )
}
