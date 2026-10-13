import React from 'react'
import { ALL_PANELS } from '@/types'
import styles from './PanelChips.module.css'

interface PanelChipsProps {
  selected: string[]
  onChange: (panels: string[]) => void
}

export function PanelChips({ selected, onChange }: PanelChipsProps) {
  const togglePanel = (panel: string) => {
    if (selected.includes(panel)) {
      onChange(selected.filter((p) => p !== panel))
    } else {
      onChange([...selected, panel].sort())
    }
  }

  return (
    <div className={styles.grid}>
      {ALL_PANELS.map((panel) => {
        const isSelected = selected.includes(panel)

        return (
          <div
            key={panel}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => togglePanel(panel)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                togglePanel(panel)
              }
            }}
            className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
            aria-label={`Panel ${panel}`}
          >
            <span className={styles.chipLabel}>Panel</span>
            <span className={styles.chipVal}>{panel}</span>
          </div>
        )
      })}
    </div>
  )
}
