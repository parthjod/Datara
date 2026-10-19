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
  const fields: (keyof Student)[] = ['roll_no', 'name']
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

  // Ensure panel is in fields for context
  if (!fields.includes('panel')) {
    fields.push('panel')
  }

  // Default fields when user asks a general query
  const finalFields: (keyof Student)[] = customFieldsSelected
    ? Array.from(new Set(fields))
    : ['roll_no', 'name', 'email', 'phone', 'panel']

  // 3. Detect filters (gender, etc.)
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
  }

  const sql = `SELECT ${finalFields.join(', ')} FROM students WHERE ${whereClauses.join(' AND ')} ${orderByClause};`

  const panelDesc = targetPanels.length > 0 ? `Panel ${targetPanels.join(', ')}` : 'authorized panels'
  const genderDesc = filters.gender ? `${filters.gender} ` : ''
  const interpretation = `TY CSE ${genderDesc}students in ${panelDesc} — showing ${finalFields.join(', ')}`

  return {
    allowed: true,
    sql,
    filters,
    fields: finalFields,
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
