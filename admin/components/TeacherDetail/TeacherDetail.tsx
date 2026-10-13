import React from 'react'
import {
  TeacherWithPermissions,
  ALL_PANELS,
  ALL_YEARS,
  ALL_DEPTS,
} from '@/types'
import { ToggleSwitch } from '@/components/ToggleSwitch/ToggleSwitch'
import { PanelChips } from '@/components/PanelChips/PanelChips'
import styles from './TeacherDetail.module.css'

interface TeacherDetailProps {
  teacher: TeacherWithPermissions
  pendingPanels: string[]
  pendingYears: string[]
  pendingDepts: string[]
  pendingActive: boolean
  onPanelsChange: (panels: string[]) => void
  onYearsChange: (years: string[]) => void
  onDeptsChange: (depts: string[]) => void
  onActiveChange: (active: boolean) => void
  onSave: () => void
  onDiscard: () => void
  saveStatus: string
}

function getInitials(name: string): string {
  const parts = name.replace(/^Prof\.\s*/i, '').split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}

export function TeacherDetail({
  teacher,
  pendingPanels,
  pendingYears,
  pendingDepts,
  pendingActive,
  onPanelsChange,
  onYearsChange,
  onDeptsChange,
  onActiveChange,
  onSave,
  onDiscard,
  saveStatus,
}: TeacherDetailProps) {
  const toggleYear = (yr: string) => {
    if (pendingYears.includes(yr)) {
      onYearsChange(pendingYears.filter((y) => y !== yr))
    } else {
      onYearsChange([...pendingYears, yr])
    }
  }

  const toggleDept = (dept: string) => {
    if (pendingDepts.includes(dept)) {
      onDeptsChange(pendingDepts.filter((d) => d !== dept))
    } else {
      onDeptsChange([...pendingDepts, dept])
    }
  }

  return (
    <div>
      {/* Section 1 — Teacher Info Card */}
      <section className={styles.infoCard}>
        <div className={styles.avatar}>{getInitials(teacher.name)}</div>
        <div className={styles.teacherMeta}>
          <h2 className={styles.teacherName}>{teacher.name}</h2>
          <div className={styles.teacherEmail}>{teacher.email}</div>
          <div className={styles.teacherDept}>
            {teacher.designation} · {teacher.department}
          </div>
        </div>

        <div className={styles.toggleWrap}>
          <span className={styles.toggleLabel}>
            {pendingActive ? 'Active' : 'Disabled'}
          </span>
          <ToggleSwitch
            checked={pendingActive}
            onChange={onActiveChange}
            label={`Toggle account active status for ${teacher.name}`}
          />
        </div>
      </section>

      {/* Section 2 — Panel Access Card */}
      <section className={styles.permCard}>
        <div className={styles.permCardHeader}>
          <div>
            <h3 className={styles.permCardTitle}>Panel Access Controls</h3>
            <p className={styles.permCardSub}>
              Select which cohort panels this instructor is authorized to query
            </p>
          </div>
          <div className={styles.selectRow}>
            <button
              type="button"
              className={styles.selectLink}
              onClick={() => onPanelsChange([...ALL_PANELS])}
            >
              Select All
            </button>
            <span style={{ color: 'var(--border)' }}>·</span>
            <button
              type="button"
              className={styles.selectLink}
              onClick={() => onPanelsChange([])}
            >
              Clear All
            </button>
          </div>
        </div>

        <PanelChips selected={pendingPanels} onChange={onPanelsChange} />
      </section>

      {/* Section 3 — Year & Department Access */}
      <section className={styles.permCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Academic Year Access</div>
            <div className={styles.chipRow}>
              {ALL_YEARS.map((yr) => {
                const isSelected = pendingYears.includes(yr)
                return (
                  <button
                    key={yr}
                    type="button"
                    className={`${styles.filterChip} ${isSelected ? styles.selected : ''}`}
                    onClick={() => toggleYear(yr)}
                    aria-pressed={isSelected}
                  >
                    {yr}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Department Access</div>
            <div className={styles.chipRow}>
              {ALL_DEPTS.map((dept) => {
                const isSelected = pendingDepts.includes(dept)
                return (
                  <button
                    key={dept}
                    type="button"
                    className={`${styles.filterChip} ${isSelected ? styles.selected : ''}`}
                    onClick={() => toggleDept(dept)}
                    aria-pressed={isSelected}
                  >
                    {dept}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Activity Summary */}
      <section className={styles.summaryCard}>
        <div className={styles.summaryTitle}>Live Permissions Summary</div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Panels Assigned:</span>
          <span className={styles.summaryVal}>
            {pendingPanels.length > 0
              ? `${pendingPanels.join(', ')} (${pendingPanels.length} panels)`
              : 'None'}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Academic Years:</span>
          <span className={styles.summaryVal}>
            {pendingYears.length > 0 ? pendingYears.join(', ') : 'None'}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Departments:</span>
          <span className={styles.summaryVal}>
            {pendingDepts.length > 0 ? pendingDepts.join(', ') : 'None'}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Status:</span>
          <span
            className={styles.summaryVal}
            style={{ color: pendingActive ? 'var(--success)' : 'var(--danger)' }}
          >
            {pendingActive ? 'Active Access' : 'Access Restricted / Inactive'}
          </span>
        </div>
      </section>

      {/* Save Row */}
      <div className={styles.saveRow}>
        <span
          className={`${styles.saveStatus} ${saveStatus ? styles.visible : ''}`}
          role="status"
          aria-live="polite"
        >
          {saveStatus}
        </span>

        <div className={styles.btnGroup}>
          <button
            type="button"
            onClick={onDiscard}
            className={styles.discardBtn}
            aria-label="Discard unsaved changes"
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={onSave}
            className={styles.saveBtn}
            aria-label="Save and sync permission updates"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
