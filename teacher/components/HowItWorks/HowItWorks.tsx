'use client'

import React, { useState } from 'react'
import styles from './HowItWorks.module.css'

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="how-it-works-content"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
      >
        <span className={styles.headerTitle}>
          <span>ℹ</span> How it works
        </span>
        <span className={styles.toggleBtn}>
          {isOpen ? 'Hide details' : 'Learn more'}
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
            ▾
          </span>
        </span>
      </div>

      <div
        id="how-it-works-content"
        className={`${styles.body} ${isOpen ? styles.bodyOpen : ''}`}
      >
        <div className={`${styles.bodyInner} ${isOpen ? styles.bodyInnerOpen : ''}`}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepTitle}>Natural Query Input</div>
              <div className={styles.stepBody}>
                Type your inquiry naturally, like &quot;Give me phone numbers of TY students in panel D and J&quot;.
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepTitle}>Targeted Query Translation</div>
              <div className={styles.stepBody}>
                The system translates your inquiry into targeted database queries while strictly enforcing your assigned panel permissions.
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepTitle}>Instant Results & Export</div>
              <div className={styles.stepBody}>
                Directly retrieve matched records on-screen and immediately export complete rosters to Excel (.xlsx) or formatted PDF.
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <div className={styles.stepTitle}>Defaulters & Email Notices</div>
              <div className={styles.stepBody}>
                Identify defaulters (attendance &lt; 80% or aggregate &lt; 24/60), dispatch customized warning emails, and simulate daily LCA countdowns.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
