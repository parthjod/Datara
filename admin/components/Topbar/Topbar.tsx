import React from 'react'
import styles from './Topbar.module.css'

interface TopbarProps {
  onLogout: () => void
}

export function Topbar({ onLogout }: TopbarProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <div className={styles.logoWrap}>
          <div className={styles.logo}>{appName}</div>
          <span className={styles.adminBadge}>Admin</span>
        </div>
        <div className={styles.right}>
          <span className={styles.adminLabel}>System Administrator</span>
          <button
            type="button"
            onClick={onLogout}
            className={styles.logoutBtn}
            aria-label="Sign out of admin portal"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
