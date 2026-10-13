import { GeminiQueryResult, Student } from '@/types'

function fallbackInterpreter(userQuery: string, allowedPanels: string[]): GeminiQueryResult {
  const q = userQuery.toLowerCase()
  const allPanels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']

  // Detect panels mentioned
  const detectedPanels: string[] = []
  allPanels.forEach((p) => {
    const regex = new RegExp(`\\bpanel\\s*${p}\\b|\\bpanel\\s*["']?${p}["']?\\b|\\b${p}\\b`, 'i')
    if (regex.test(userQuery)) {
      detectedPanels.push(p.toUpperCase())
    }
  })

  // Target panels default to allowed panels if none specified
  let targetPanels = detectedPanels
  if (targetPanels.length === 0) {
    targetPanels = [...allowedPanels]
  }

  // Check unauthorized panels
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

  // Detect column fields
  const fields: (keyof Student)[] = ['roll_no', 'name']
  if (q.includes('email')) fields.push('email')
  if (q.includes('phone') || q.includes('contact') || q.includes('mobile')) fields.push('phone')
  if (q.includes('address') || q.includes('area') || q.includes('city')) fields.push('address')
  if (q.includes('aadhar') || q.includes('adhaar')) fields.push('aadhar')
  if (q.includes('dob') || q.includes('birth')) fields.push('dob')
  if (q.includes('gender')) fields.push('gender')
  if (q.includes('panel')) fields.push('panel')
  if (q.includes('year')) fields.push('year')
  if (q.includes('dept') || q.includes('department')) fields.push('department')

  const finalFields: (keyof Student)[] =
    fields.length > 2
      ? Array.from(new Set(fields))
      : ['roll_no', 'name', 'email', 'phone', 'panel']

  const panelInClause = targetPanels.map((p) => `'${p}'`).join(', ')
  const sql = `SELECT ${finalFields.join(', ')} FROM students WHERE panel IN (${panelInClause}) AND year = 'TY' AND department = 'CSE';`

  return {
    allowed: true,
    sql,
    filters: {
      year: 'TY',
      department: 'CSE',
      panel: targetPanels,
    },
    fields: finalFields,
    interpretation: `TY CSE students in Panel ${targetPanels.join(', ')} — showing ${finalFields.join(', ')}`,
    reason: '',
  }
}

export async function queryGemini(
  userQuery: string,
  allowedPanels: string[]
): Promise<GeminiQueryResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    // Demo fallback when API key is not yet configured
    return fallbackInterpreter(userQuery, allowedPanels)
  }

  const prompt = `
You are an expert natural language to PostgreSQL query translator.

DATABASE SCHEMA:
You only have access to a single table called "students" with these exact columns:
roll_no (text), name (text), email (text), phone (text), address (text), aadhar (text), dob (text), gender (text), department (text), panel (text), year (text), program (text)

FACULTY CONSTRAINTS:
The faculty member executing this query is strictly permitted to view ONLY these panels: ${allowedPanels.join(', ')}

TEACHER'S QUERY:
"${userQuery}"

TASK:
1. Translate the teacher's natural language request into a valid, executable PostgreSQL SELECT query.
2. Check if the query asks for panels outside the allowed panels list (${allowedPanels.join(', ')}).
   - If unauthorized panels are requested, set "allowed": false, and describe in "reason" what is allowed.
   - If allowed, set "allowed": true and formulate the PostgreSQL SELECT statement in "sql".
3. In the SELECT clause: select the columns requested or implied. Always include roll_no, name, and any specifically requested columns.
4. In the WHERE clause: always ensure "panel" is restricted to the teacher's allowed list (${allowedPanels.map((p) => `'${p}'`).join(', ')}). Add year = 'TY' and department = 'CSE' if requested or implied.
5. Return ONLY a valid JSON object in this exact format, with no markdown code blocks:
{
  "allowed": true,
  "sql": "SELECT roll_no, name, email, phone, panel FROM students WHERE panel IN ('D', 'J') AND year = 'TY' AND department = 'CSE';",
  "fields": ["roll_no", "name", "email", "phone", "panel"],
  "interpretation": "TY CSE students in Panel D and J — showing roll_no, name, email, phone, panel",
  "reason": ""
}
`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )

    if (!res.ok) {
      console.warn(`Gemini API returned ${res.status}. Falling back to local interpreter.`)
      return fallbackInterpreter(userQuery, allowedPanels)
    }

    const json = await res.json()
    const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()

    const parsed = JSON.parse(clean) as GeminiQueryResult

    // Ensure fallback SQL if AI omitted it
    if (parsed.allowed && !parsed.sql) {
      const fallback = fallbackInterpreter(userQuery, allowedPanels)
      parsed.sql = fallback.sql
    }

    return parsed
  } catch (err) {
    console.warn('Gemini query error, using fallback interpreter:', err)
    return fallbackInterpreter(userQuery, allowedPanels)
  }
}
