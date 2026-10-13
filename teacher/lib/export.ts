import * as XLSX from 'xlsx'
import { Student } from '@/types'

export function exportToExcel(data: Partial<Student>[], filename: string): void {
  if (!data.length) return

  // Format headers nicely
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, unknown> = {}
    Object.keys(row).forEach((key) => {
      const formattedKey = key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      formattedRow[formattedKey] = (row as Record<string, unknown>)[key] ?? ''
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

export function exportToCSV(data: Partial<Student>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0]) as (keyof Student)[]
  const rows = data.map(row =>
    headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
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

export function exportToPDF(data: Partial<Student>[], queryText: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0]) as string[]
  const rows = data
    .map(r => `<tr>${headers.map(h => `<td>${(r as Record<string,unknown>)[h] ?? ''}</td>`).join('')}</tr>`)
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
  <thead><tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = () => window.print()<\/script>
</body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}
