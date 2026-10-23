import { QueryResult, Student } from '@/types'

/**
 * Offline natural-language query parser.
 * Translates faculty inquiries into validated PostgreSQL queries without any external AI API.
 */
export function parseOfflineQuery(
  userQuery: string,
  allowedPanels: string[]
): QueryResult {
  const q = userQuery.toLowerCase().trim()

  // 1. Detect panels mentioned in the query
  const detectedPanels: string[] = []

  // Pattern A: "panels? A, B, and C" or "panel D and J" or "panel D, J" or "panel-D"
  const panelListRegex = /\bpanels?\s*[:\-]?\s*([A-K](?:\s*(?:,|and|&|\/)\s*[A-K])*)/gi
  let match: RegExpExecArray | null
  while ((match = panelListRegex.exec(userQuery)) !== null) {
    const tokens = match[1].split(/\s*(?:and|&|,|\/|\s)\s*/i)
    tokens.forEach((t) => {
      const clean = t.trim().toUpperCase()
      if (clean.length === 1 && clean >= 'A' && clean <= 'K') {
        detectedPanels.push(clean)
      }
    })
  }

  // Pattern B: "division D", "section D", "cohort D", "batch D"
  const sectionRegex = /\b(?:division|section|cohort|batch)\s*[:\-]?\s*([A-K])\b/gi
  while ((match = sectionRegex.exec(userQuery)) !== null) {
    detectedPanels.push(match[1].toUpperCase())
  }

  // Pattern C: Quoted letters like 'D', "J", 'A'
  const quotedRegex = /['"]([A-K])['"]/gi
  while ((match = quotedRegex.exec(userQuery)) !== null) {
    detectedPanels.push(match[1].toUpperCase())
  }

  // Pattern D: Standalone panel letters (B, C, D, E, F, G, H, J, K)
  // Note: 'A' and 'I' are excluded here to prevent false positives with English words 'a' and 'I'
  const safeStandalone = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
  safeStandalone.forEach((p) => {
    const regex = new RegExp(`\\b${p}\\b`, 'i')
    if (regex.test(userQuery)) {
      detectedPanels.push(p.toUpperCase())
    }
  })

  // Deduplicate detected panels while preserving order
  const uniqueDetected = Array.from(new Set(detectedPanels))

  // If no panels explicitly requested, default to all authorized panels
  const targetPanels = uniqueDetected.length > 0 ? uniqueDetected : [...allowedPanels]

  // Enforce access control: check for any unauthorized panels
  const unauthorized = targetPanels.filter((p) => !allowedPanels.includes(p))
  if (unauthorized.length > 0) {
    return {
      allowed: false,
      sql: '',
      filters: {},
      fields: [],
      interpretation: `Query requests panel ${unauthorized.join(', ')} which is outside your authorized access list.`,
      reason: `You do not have access to panel ${unauthorized.join(', ')}. Your authorized panels are: ${allowedPanels.join(', ')}.`,
    }
  }

  // 2. Detect column fields
  const fields: string[] = ['roll_no', 'name']
  let customFieldsSelected = false

  if (q.includes('email') || q.includes('mail')) {
    fields.push('email')
    customFieldsSelected = true
  }
  if (q.includes('phone') || q.includes('contact') || q.includes('mobile') || q.includes('number')) {
    fields.push('phone')
    customFieldsSelected = true
  }
  if (
    q.includes('address') ||
    q.includes('area') ||
    q.includes('city') ||
    q.includes('residence') ||
    q.includes('location')
  ) {
    fields.push('address')
    customFieldsSelected = true
  }
  if (q.includes('aadhar') || q.includes('adhaar') || q.includes('uid')) {
    fields.push('aadhar')
    customFieldsSelected = true
  }
  if (q.includes('dob') || q.includes('birth') || q.includes('age') || q.includes('date of birth')) {
    fields.push('dob')
    customFieldsSelected = true
  }
  if (q.includes('gender') || q.includes('sex')) {
    fields.push('gender')
    customFieldsSelected = true
  }
  if (q.includes('panel') || q.includes('division') || q.includes('section')) {
    fields.push('panel')
  }
  if (q.includes('year')) {
    fields.push('year')
  }
  if (q.includes('dept') || q.includes('department')) {
    fields.push('department')
  }
  if (q.includes('program') || q.includes('course') || q.includes('degree')) {
    fields.push('program')
  }

  // Academic & Evaluation field detection
  if (q.includes('attendance') || q.includes('attend')) {
    fields.push('attendance')
    customFieldsSelected = true
  }
  const hasSpecificAssessment =
    q.includes('cca1') || q.includes('cca 1') ||
    q.includes('cca2') || q.includes('cca 2') ||
    q.includes('midterm') || q.includes('mid term') || q.includes('mid-term') ||
    q.includes('lca1') || q.includes('lca 1') ||
    q.includes('lca2') || q.includes('lca 2') ||
    q.includes('lca3') || q.includes('lca 3') ||
    q.includes('aggregate') || q.includes('total marks') || q.includes('internal aggregate')

  if (q.includes('cca1') || q.includes('cca 1')) {
    fields.push('cca1')
    customFieldsSelected = true
  }
  if (q.includes('cca2') || q.includes('cca 2')) {
    fields.push('cca2')
    customFieldsSelected = true
  }
  if (q.includes('midterm') || q.includes('mid term') || q.includes('mid-term')) {
    fields.push('midterm')
    customFieldsSelected = true
  }
  if (q.includes('aggregate') || q.includes('total marks') || q.includes('internal aggregate')) {
    fields.push('(cca1 + cca2 + midterm) AS aggregate')
    customFieldsSelected = true
  }
  if (q.includes('all marks') || q.includes('all assessments')) {
    fields.push('cca1', 'cca2', 'midterm', '(cca1 + cca2 + midterm) AS aggregate', 'lca1', 'lca2', 'lca3')
    customFieldsSelected = true
  } else if (!hasSpecificAssessment && (q.includes('evaluation') || q.includes('assessment'))) {
    fields.push('cca1', 'cca2', 'midterm', '(cca1 + cca2 + midterm) AS aggregate', 'lca1', 'lca2', 'lca3')
    customFieldsSelected = true
  } else if (!hasSpecificAssessment && (q.includes('marks') || q.includes('scores') || q.includes('academics'))) {
    fields.push('cca1', 'cca2', 'midterm', '(cca1 + cca2 + midterm) AS aggregate')
    customFieldsSelected = true
  }
  if (q.includes('lca1') || q.includes('lca 1')) {
    fields.push('lca1')
    customFieldsSelected = true
  }
  if (q.includes('lca2') || q.includes('lca 2')) {
    fields.push('lca2')
    customFieldsSelected = true
  }
  if (q.includes('lca3') || q.includes('lca 3')) {
    fields.push('lca3')
    customFieldsSelected = true
  }
  if (q.includes('lca') && !q.includes('lca1') && !q.includes('lca2') && !q.includes('lca3')) {
    fields.push('lca1', 'lca2', 'lca3')
    customFieldsSelected = true
  }
  if (q.includes('detained') || q.includes('detention')) {
    fields.push('detained')
    customFieldsSelected = true
  }

  // 3. Detect Defaulter Filters & Conditions
  const whereClauses: string[] = []
  const filters: Record<string, any> = {
    year: 'TY',
    department: 'CSE',
    panel: targetPanels,
  }

  const panelInClause = targetPanels.map((p) => `'${p}'`).join(', ')
  whereClauses.push(`panel IN (${panelInClause})`)
  whereClauses.push(`year = 'TY'`)
  whereClauses.push(`department = 'CSE'`)

  let queryCategory = 'general'
  let customInterpretation = ''

  const isAttendanceDefaulterQuery =
    (q.includes('defaulter') && (q.includes('attend') || q.includes('presence'))) ||
    q.includes('attendance below 80') ||
    q.includes('attendance less than 80') ||
    q.includes('attendance < 80') ||
    q.includes('low attendance') ||
    q.includes('below 80%') ||
    q.includes('below 80 percent')

  const isMarksDefaulterQuery =
    (q.includes('defaulter') &&
      (q.includes('mark') ||
        q.includes('score') ||
        q.includes('cca') ||
        q.includes('midterm') ||
        q.includes('mid term') ||
        q.includes('aggregate'))) ||
    q.includes('aggregate below 24') ||
    q.includes('aggregate less than 24') ||
    q.includes('aggregate < 24') ||
    q.includes('below 24') ||
    q.includes('24/60') ||
    q.includes('low marks') ||
    q.includes('academic defaulter')

  const isLcaDefaulterQuery =
    q.includes('lca defaulter') ||
    q.includes('missed lca') ||
    q.includes('pending lca') ||
    q.includes('did not appear for lca') ||
    q.includes('not appeared for lca') ||
    q.includes('lca absent')

  const isDetainedQuery =
    q.includes('detained student') || q.includes('list of detained') || q.includes('show detained') || q === 'detained'

  if (isAttendanceDefaulterQuery && !isMarksDefaulterQuery) {
    // Specific: Defaulters by Attendance (<80%)
    queryCategory = 'attendance_defaulter'
    whereClauses.push(`attendance < 80`)
    fields.push('attendance', 'email', 'phone')
    customInterpretation = `Defaulter students with attendance below 80% in ${targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'} — showing exact attendance percentage`
  } else if (isMarksDefaulterQuery && !isAttendanceDefaulterQuery) {
    // Specific: Defaulters by Marks (Aggregate < 24/60)
    queryCategory = 'marks_defaulter'
    whereClauses.push(`(cca1 + cca2 + midterm) < 24`)
    fields.push('cca1', 'cca2', 'midterm', '(cca1 + cca2 + midterm) AS aggregate', 'email', 'phone')
    customInterpretation = `Academic defaulter students with CCA1 + CCA2 + Midterm aggregate below 24/60 in ${targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'}`
  } else if (isLcaDefaulterQuery) {
    // LCA Defaulters
    queryCategory = 'lca_defaulter'
    whereClauses.push(`(lca1 IS NULL OR lca2 IS NULL OR lca3 IS NULL OR detained = true)`)
    fields.push('lca1', 'lca2', 'lca3', 'detained', 'email', 'phone')
    customInterpretation = `Students with pending or missed LCA assessments in ${targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'}`
  } else if (isDetainedQuery) {
    // Detained Students
    queryCategory = 'detained'
    whereClauses.push(`detained = true`)
    fields.push('attendance', '(cca1 + cca2 + midterm) AS aggregate', 'lca1', 'lca2', 'lca3', 'detained', 'email')
    customInterpretation = `Detained students in ${targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'}`
  } else if (q.includes('defaulter') || q.includes('defaulters')) {
    // Combined: All Defaulters (attendance < 80% OR aggregate < 24/60)
    queryCategory = 'all_defaulters'
    whereClauses.push(`(attendance < 80 OR (cca1 + cca2 + midterm) < 24)`)
    fields.push('attendance', 'cca1', 'cca2', 'midterm', '(cca1 + cca2 + midterm) AS aggregate', 'email')
    customInterpretation = `All defaulter students (attendance < 80% or marks aggregate < 24/60) in ${targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'}`
  }

  // Ensure panel is in fields for context
  if (!fields.includes('panel')) {
    fields.push('panel')
  }

  // Default fields when user asks a general query
  const finalFields: string[] =
    queryCategory !== 'general' || customFieldsSelected
      ? Array.from(new Set(fields))
      : ['roll_no', 'name', 'email', 'phone', 'panel']

  // Gender filter
  if (/\b(?:female|girl|girls|women|woman)\b/i.test(userQuery)) {
    whereClauses.push(`gender = 'Female'`)
    filters.gender = 'Female'
    if (!finalFields.includes('gender')) finalFields.push('gender')
  } else if (/\b(?:male|boy|boys|men|man)\b/i.test(userQuery)) {
    whereClauses.push(`gender = 'Male'`)
    filters.gender = 'Male'
    if (!finalFields.includes('gender')) finalFields.push('gender')
  }

  // Sorting
  let orderByClause = 'ORDER BY roll_no ASC'
  if (/\b(?:sort by name|order by name|alphabetical)\b/i.test(userQuery)) {
    orderByClause = 'ORDER BY name ASC'
  } else if (queryCategory === 'attendance_defaulter') {
    orderByClause = 'ORDER BY attendance ASC'
  } else if (queryCategory === 'marks_defaulter') {
    orderByClause = 'ORDER BY (cca1 + cca2 + midterm) ASC'
  }

  const sql = `SELECT ${finalFields.join(', ')} FROM students WHERE ${whereClauses.join(' AND ')} ${orderByClause};`

  const panelDesc = targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'
  const genderDesc = filters.gender ? `${filters.gender} ` : ''
  const interpretation =
    customInterpretation ||
    `TY CSE ${genderDesc}students in ${panelDesc} — showing ${finalFields
      .map((f) => (f.includes(' AS ') ? f.split(' AS ')[1] : f))
      .join(', ')}`

  return {
    allowed: true,
    sql,
    filters,
    fields: finalFields as any,
    interpretation,
    reason: '',
  }
}

export const queryGemini = async (
  userQuery: string,
  allowedPanels: string[]
): Promise<QueryResult> => {
  return parseOfflineQuery(userQuery, allowedPanels)
}

