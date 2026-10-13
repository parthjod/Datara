import React from 'react'
import styles from './Topbar.module.css'

interface TopbarProps {
  teacherName: string
  onLogout: () => void
}

export function Topbar({ teacherName, onLogout }: TopbarProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <div className={styles.logo}>{appName}</div>
        <div className={styles.right}>
          <span className={styles.teacherName}>{teacherName}</span>
          <button
            type="button"
            onClick={onLogout}
            className={styles.logoutBtn}
            aria-label="Sign out of portal"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
