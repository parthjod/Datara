import React from 'react'
import { TeacherWithPermissions } from '@/types'
import styles from './TeacherSidebar.module.css'

interface TeacherSidebarProps {
  teachers: TeacherWithPermissions[]
  selectedEmail: string
  onSelect: (email: string) => void
  onAddTeacher: () => void
}

function getInitials(name: string): string {
  const parts = name.replace(/^Prof\.\s*/i, '').split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}

export function TeacherSidebar({
  teachers,
  selectedEmail,
  onSelect,
  onAddTeacher,
}: TeacherSidebarProps) {
  return (
    <aside className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Faculty Roster</h2>
        <span className={styles.countPill}>{teachers.length}</span>
      </div>

      <ul className={styles.list}>
        {teachers.map((teacher) => {
          const isSelected = teacher.email === selectedEmail
          const isActive = teacher.permissions.active

          return (
            <li
              key={teacher.email}
              onClick={() => onSelect(teacher.email)}
              className={`${styles.item} ${isSelected ? styles.active : ''}`}
              aria-current={isSelected ? 'true' : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(teacher.email)
                }
              }}
            >
              <div className={styles.avatar}>{getInitials(teacher.name)}</div>
              <div className={styles.info}>
                <div className={styles.name}>{teacher.name}</div>
                <div className={styles.designation}>{teacher.designation}</div>
              </div>
              <span
                className={`${styles.statusDot} ${!isActive ? styles.inactive : ''}`}
                title={isActive ? 'Access Active' : 'Access Deactivated'}
              />
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={onAddTeacher}
        className={styles.addBtn}
        aria-label="Add new teacher to roster"
      >
        <span>+</span> Add Teacher
      </button>
    </aside>
  )
}
