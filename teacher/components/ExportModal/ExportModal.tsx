'use client'

import React, { useEffect, useRef } from 'react'
import { Student } from '@/types'
import { exportToExcel, exportToPDF } from '@/lib/export'
import styles from './ExportModal.module.css'

interface ExportModalProps {
  open: boolean
  totalCount: number
  data: Partial<Student>[]
  queryText: string
  onClose: () => void
  onSendEmail?: () => void
}

export function ExportModal({
  open,
  totalCount,
  data,
  queryText,
  onClose,
  onSendEmail,
}: ExportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const handleExportExcel = () => {
    const filename = `student_export_${new Date().toISOString().slice(0, 10)}`
    exportToExcel(data, filename)
    onClose()
  }

  const handleExportPDF = () => {
    exportToPDF(data, queryText)
    onClose()
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        className={styles.modal}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="export-modal-title" className={styles.title}>
            Export Dataset & Actions
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </div>

        <p className={styles.subtitle}>
          {totalCount} matching student records available
        </p>

        <div className={styles.options}>
          <button
            type="button"
            className={styles.optionBtn}
            onClick={handleExportExcel}
          >
            <span className={styles.optionIcon}>📊</span>
            <div>
              <div className={styles.optionTitle}>Excel Workbook (.xlsx)</div>
              <div className={styles.optionSub}>
                Native Microsoft Excel spreadsheet with formatted headers and column widths
              </div>
            </div>
          </button>

          <button
            type="button"
            className={styles.optionBtn}
            onClick={handleExportPDF}
          >
            <span className={styles.optionIcon}>📄</span>
            <div>
              <div className={styles.optionTitle}>Printable Document (PDF)</div>
              <div className={styles.optionSub}>
                Formal styled printable view formatted for A4 reports
              </div>
            </div>
          </button>

          {onSendEmail && (
            <button
              type="button"
              className={styles.optionBtn}
              onClick={() => {
                onClose()
                onSendEmail()
              }}
            >
              <span className={styles.optionIcon}>✉️</span>
              <div>
                <div className={styles.optionTitle}>Send Defaulter Notice (Email)</div>
                <div className={styles.optionSub}>
                  Dispatch customized official notification emails to defaulter students
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
