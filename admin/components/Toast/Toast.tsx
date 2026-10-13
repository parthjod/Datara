import React from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  visible: boolean
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toast} ${visible ? styles.visible : ''}`}
    >
      {message}
    </div>
  )
}
