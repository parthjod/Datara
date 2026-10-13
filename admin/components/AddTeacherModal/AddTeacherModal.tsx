'use client'

import React, { useState, useEffect, useRef } from 'react'
import { TeacherRecord } from '@/types'
import { PanelChips } from '@/components/PanelChips/PanelChips'
import styles from './AddTeacherModal.module.css'

interface AddTeacherModalProps {
  open: boolean
  onClose: () => void
  onAdd: (teacher: TeacherRecord, panels: string[]) => void
  existingEmails: string[]
}

export function AddTeacherModal({
  open,
  onClose,
  onAdd,
  existingEmails,
}: AddTeacherModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('Computer Science & Engineering')
  const [designation, setDesignation] = useState('Assistant Professor')
  const [panels, setPanels] = useState<string[]>(['A'])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    setName('')
    setEmail('')
    setDepartment('Computer Science & Engineering')
    setDesignation('Assistant Professor')
    setPanels(['A'])
    setErrors({})

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { [key: string]: string } = {}

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const domain = process.env.NEXT_PUBLIC_INSTITUTE_DOMAIN || 'mitwpu.edu.in'

    if (!trimmedName) {
      errs.name = 'Full name is required.'
    }

    if (!trimmedEmail) {
      errs.email = 'Email address is required.'
    } else if (!trimmedEmail.endsWith(`@${domain}`)) {
      errs.email = `Email must end with @${domain}`
    } else if (existingEmails.map((e) => e.toLowerCase()).includes(trimmedEmail)) {
      errs.email = 'A teacher with this email already exists in the roster.'
    }

    if (panels.length === 0) {
      errs.panels = 'At least one panel must be assigned.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const formattedName = trimmedName.startsWith('Prof.') ? trimmedName : `Prof. ${trimmedName}`

    onAdd(
      {
        name: formattedName,
        email: trimmedEmail,
        department: department.trim() || 'Computer Science & Engineering',
        designation: designation.trim() || 'Assistant Professor',
      },
      panels
    )
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-teacher-title"
    >
      <div className={styles.modal} ref={modalRef} tabIndex={-1}>
        <div className={styles.header}>
          <h2 id="add-teacher-title" className={styles.title}>
            Add Faculty Member
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="teacher-full-name">Full Name</label>
            <input
              id="teacher-full-name"
              type="text"
              placeholder="e.g. Ramesh Kulkarni"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <div className={styles.fieldError}>{errors.name}</div>}
          </div>

          <div className={styles.field}>
            <label htmlFor="teacher-new-email">University Email</label>
            <input
              id="teacher-new-email"
              type="email"
              placeholder="e.g. ramesh.kulkarni@mitwpu.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && <div className={styles.fieldError}>{errors.email}</div>}
          </div>

          <div className={styles.field}>
            <label htmlFor="teacher-designation">Designation</label>
            <input
              id="teacher-designation"
              type="text"
              placeholder="e.g. Assistant Professor"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="teacher-dept">Department</label>
            <input
              id="teacher-dept"
              type="text"
              placeholder="e.g. Computer Science & Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className={styles.panelSection}>
            <div className={styles.panelLabel}>Initial Panel Assignment</div>
            <PanelChips selected={panels} onChange={setPanels} />
            {errors.panels && (
              <div className={styles.fieldError}>{errors.panels}</div>
            )}
          </div>

          <div className={styles.btnRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.addBtn}>
              Add to Roster
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
