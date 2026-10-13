'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TeacherRecord,
  TeacherPermissions,
  TeacherWithPermissions,
} from '@/types'
import {
  TEACHER_ROSTER,
  getAllPermissions,
  saveTeacherPermissions,
  saveAllPermissions,
  addTeacher,
} from '@/lib/permissions'
import { getAdminSession, clearAdminSession } from '@/lib/auth'
import { Topbar } from '@/components/Topbar/Topbar'
import { TeacherSidebar } from '@/components/TeacherSidebar/TeacherSidebar'
import { TeacherDetail } from '@/components/TeacherDetail/TeacherDetail'
import { AddTeacherModal } from '@/components/AddTeacherModal/AddTeacherModal'
import { Toast } from '@/components/Toast/Toast'
import styles from './admin.module.css'

export default function AdminPage() {
  const router = useRouter()

  // Teachers — roster + live permissions merged
  const [teachers, setTeachers] = useState<TeacherWithPermissions[]>([])
  const [selectedEmail, setSelectedEmail] = useState<string>('')

  // Pending (unsaved) edit state for the selected teacher
  const [pendingPanels, setPendingPanels] = useState<string[]>([])
  const [pendingYears, setPendingYears] = useState<string[]>([])
  const [pendingDepts, setPendingDepts] = useState<string[]>([])
  const [pendingActive, setPendingActive] = useState<boolean>(true)

  // UI state
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })
  const [saveStatus, setSaveStatus] = useState('')

  function showToast(message: string, duration = 2800) {
    setToast({ message, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), duration)
  }

  function selectTeacher(email: string, list: TeacherWithPermissions[] = teachers) {
    const t = list.find((item) => item.email === email)
    if (!t) return
    setSelectedEmail(email)
    setPendingPanels([...t.permissions.panels])
    setPendingYears([...t.permissions.years])
    setPendingDepts([...t.permissions.departments])
    setPendingActive(t.permissions.active)
    setSaveStatus('')
  }

  useEffect(() => {
    if (!getAdminSession()) {
      router.push('/login')
      return
    }

    const perms = getAllPermissions()
    const merged: TeacherWithPermissions[] = TEACHER_ROSTER.map((t) => ({
      ...t,
      permissions: perms[t.email] || {
        panels: [],
        years: ['TY'],
        departments: ['CSE'],
        active: true,
      },
    }))

    // Also include any added teachers present in storage but not in static roster
    const rosterEmails = new Set(TEACHER_ROSTER.map((t) => t.email))
    Object.keys(perms).forEach((email) => {
      if (!rosterEmails.has(email)) {
        const parts = email.split('@')[0].split('.')
        const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        merged.push({
          email,
          name: `Prof. ${name}`,
          department: 'Computer Science & Engineering',
          designation: 'Assistant Professor',
          permissions: perms[email],
        })
      }
    })

    setTeachers(merged)
    if (merged.length > 0) {
      selectTeacher(merged[0].email, merged)
    }

    // Also fetch latest synced permissions from shared backend
    fetch('/api/permissions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          localStorage.setItem('dq_teacher_permissions', JSON.stringify(data))
          setTeachers((prev) => {
            const updated = prev.map((t) =>
              data[t.email] ? { ...t, permissions: data[t.email] } : t
            )
            if (updated.length > 0) {
              selectTeacher(updated[0].email, updated)
            }
            return updated
          })
        }
      })
      .catch(() => {})
  }, [router])

  function handleSave() {
    const updated: TeacherPermissions = {
      panels: pendingPanels,
      years: pendingYears,
      departments: pendingDepts,
      active: pendingActive,
    }
    saveTeacherPermissions(selectedEmail, updated)

    // Update local state
    setTeachers((prev) =>
      prev.map((t) =>
        t.email === selectedEmail ? { ...t, permissions: updated } : t
      )
    )

    const teacherName = teachers.find((t) => t.email === selectedEmail)?.name || 'Teacher'
    showToast(`✓ Permissions updated for ${teacherName}`)
    setSaveStatus('✓ Changes saved and synced to database')
    setTimeout(() => setSaveStatus(''), 3000)
  }

  function handleDiscard() {
    selectTeacher(selectedEmail)
    showToast('Reverted unsaved changes')
  }

  function handleActiveToggle(newVal: boolean) {
    setPendingActive(newVal)
  }

  function handleAddTeacher(teacher: TeacherRecord, panels: string[]) {
    addTeacher(teacher, panels)
    const newEntry: TeacherWithPermissions = {
      ...teacher,
      permissions: {
        panels,
        years: ['TY'],
        departments: ['CSE'],
        active: true,
      },
    }
    const updatedList = [...teachers, newEntry]
    setTeachers(updatedList)
    setShowAddModal(false)
    selectTeacher(teacher.email, updatedList)
    showToast(`✓ ${teacher.name} added successfully`)
  }

  function handleLogout() {
    clearAdminSession()
    router.push('/login')
  }

  const selectedTeacher = teachers.find((t) => t.email === selectedEmail)

  return (
    <div className={styles.page}>
      <Topbar onLogout={handleLogout} />

      <main className={styles.body}>
        <TeacherSidebar
          teachers={teachers}
          selectedEmail={selectedEmail}
          onSelect={(email) => selectTeacher(email)}
          onAddTeacher={() => setShowAddModal(true)}
        />

        <div className={styles.mainContent}>
          {selectedTeacher ? (
            <TeacherDetail
              teacher={selectedTeacher}
              pendingPanels={pendingPanels}
              pendingYears={pendingYears}
              pendingDepts={pendingDepts}
              pendingActive={pendingActive}
              onPanelsChange={setPendingPanels}
              onYearsChange={setPendingYears}
              onDeptsChange={setPendingDepts}
              onActiveChange={handleActiveToggle}
              onSave={handleSave}
              onDiscard={handleDiscard}
              saveStatus={saveStatus}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              No faculty selected
            </div>
          )}
        </div>
      </main>

      <AddTeacherModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTeacher}
        existingEmails={teachers.map((t) => t.email)}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}
