import * as XLSX from 'xlsx'
import { Student } from '@/types'

function formatExportHeader(key: string): string {
  if (key === 'cca1') return 'CCA 1'
  if (key === 'cca2') return 'CCA 2'
  if (key === 'midterm') return 'Midterm'
  if (key === 'aggregate') return 'Aggregate (/60)'
  if (key === 'attendance') return 'Attendance (%)'
  if (key === 'lca1') return 'LCA 1'
  if (key === 'lca2') return 'LCA 2'
  if (key === 'lca3') return 'LCA 3'
  if (key === 'detained') return 'Academic Status'
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatExportValue(key: string, val: unknown): unknown {
  if ((key === 'lca1' || key === 'lca2' || key === 'lca3')) {
    if (val === null || val === undefined || val === '') return 'Pending'
    if (Number(val) === 0) return '0 (Buffer Expired)'
  }
  if (key === 'detained') {
    return val === true ? 'Detained' : 'Regular'
  }
  return val ?? ''
}

const INTERNAL_FIELDS = new Set([
  'lca1_days_left',
  'lca1_buffer_left',
  'lca1_detention_pending',
  'lca2_days_left',
  'lca2_buffer_left',
  'lca2_detention_pending',
  'lca3_days_left',
  'lca3_buffer_left',
  'lca3_detention_pending',
  'updated_at',
  'id',
  'created_at',
])

export function exportToExcel(
  data: Partial<Student>[],
  filename: string,
  columns?: string[]
): void {
  if (!data.length) return

  const targetColumns =
    columns && columns.length > 0
      ? columns.filter((k) => !INTERNAL_FIELDS.has(k))
      : Object.keys(data[0] || {}).filter((k) => !INTERNAL_FIELDS.has(k))

  // Format headers and values nicely for ONLY the queried columns
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, unknown> = {}
    targetColumns.forEach((key) => {
      const formattedKey = formatExportHeader(key)
      formattedRow[formattedKey] = formatExportValue(key, (row as Record<string, unknown>)[key])
    })
    return formattedRow
  })

  const worksheet = XLSX.utils.json_to_sheet(formattedData)

  // Calculate clean auto-fit column widths
  const keys = Object.keys(formattedData[0] || {})
  const colWidths = keys.map((key) => {
    let maxLen = key.length
    formattedData.forEach((row) => {
      const val = String(row[key] ?? '')
      if (val.length > maxLen) maxLen = val.length
    })
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function exportToCSV(
  data: Partial<Student>[],
  filename: string,
  columns?: string[]
): void {
  if (!data.length) return
  const headers =
    columns && columns.length > 0
      ? columns.filter((k) => !INTERNAL_FIELDS.has(k))
      : Object.keys(data[0] || {}).filter((k) => !INTERNAL_FIELDS.has(k))

  const rows = data.map((row) =>
    headers
      .map((h) => `"${String((row as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [headers.map((h) => formatExportHeader(h)).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToPDF(
  data: Partial<Student>[],
  queryText: string,
  columns?: string[]
): void {
  if (!data.length) return

  const targetColumns =
    columns && columns.length > 0
      ? columns.filter((k) => !INTERNAL_FIELDS.has(k))
      : Object.keys(data[0] || {}).filter((k) => !INTERNAL_FIELDS.has(k))

  const rows = data
    .map(
      (r) =>
        `<tr>${targetColumns
          .map((h) => {
            const formattedVal = formatExportValue(h, (r as Record<string, unknown>)[h])
            return `<td>${formattedVal !== null && formattedVal !== undefined ? formattedVal : ''}</td>`
          })
          .join('')}</tr>`
    )
    .join('')

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Datara'
  const html = `<!DOCTYPE html><html><head><title>Student Data Export</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 1rem; }
  h2 { font-size: 15px; margin-bottom: 4px; }
  p { color: #666; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0b0b0c; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; letter-spacing: .04em; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f8f8f8; }
  @media print { @page { margin: 1cm; } }
</style></head><body>
<h2>${appName} — MIT-WPU Student Data Export</h2>
<p>Query: ${queryText} &nbsp;·&nbsp; Exported: ${new Date().toLocaleString('en-IN')} &nbsp;·&nbsp; Total: ${data.length} students</p>
<table>
  <thead><tr>${targetColumns.map((h) => `<th>${formatExportHeader(h).toUpperCase()}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = () => window.print()<\/script>
</body></html>`
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
