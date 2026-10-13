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
            : 'e.g. TY CSE students in panel D and J, show their phone number and aadhar...'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading || disabled}
        aria-label="Student data query prompt"
      />
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
