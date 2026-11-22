import Papa from 'papaparse'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

// Stops spreadsheet apps from running a cell as a formula
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? "'" + v : v)

export const GET = handle(async () => {
  const admin = await requireRole('ADMIN')
  const rows = await db.student.findMany({ orderBy: [{ class: { name: 'asc' } }, { fullName: 'asc' }], select: { studentCode: true, fullName: true, gender: true, class: { select: { name: true } }, user: { select: { active: true } } } })
  const csv = Papa.unparse(rows.map((r) => ({ studentCode: safe(r.studentCode), fullName: safe(r.fullName), class: r.class.name, gender: r.gender ?? '', active: r.user.active ? 'yes' : 'no' })))
  await audit('STUDENT_EXPORT', { count: rows.length }, admin.id)
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="students.csv"' } })
})
