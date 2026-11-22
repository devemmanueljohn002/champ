import Papa from 'papaparse'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, randomPassword, requireRole } from '@/lib/auth'

export const maxDuration = 60
const MAX_ROWS = 300
const row = z.object({
  studentcode: z.string().trim().min(2).max(40),
  fullname: z.string().trim().min(2).max(120),
  class: z.string().trim().min(1),
  gender: z.enum(['M', 'F']).optional().or(z.literal('')),
  password: z.string().min(6).max(100).optional().or(z.literal('')),
})

// CSV columns: studentCode, fullName, class, gender (optional), password (optional)
export const POST = handle(async (req) => {
  const admin = await requireRole('ADMIN')
  const { csv } = z.object({ csv: z.string().max(1_000_000) }).parse(await req.json())
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z]/g, '') })
  if (parsed.data.length === 0) return Response.json({ error: 'The file has no rows' }, { status: 400 })
  if (parsed.data.length > MAX_ROWS) return Response.json({ error: `Import up to ${MAX_ROWS} students at a time` }, { status: 400 })

  const classes = new Map((await db.schoolClass.findMany()).map((c) => [c.name.toUpperCase(), c.id]))
  const codes = parsed.data.map((r) => (r.studentcode ?? '').trim())
  const existing = new Set((await db.user.findMany({ where: { loginId: { in: codes } }, select: { loginId: true } })).map((u) => u.loginId))
  const seen = new Set<string>()
  const skipped: { row: number; studentCode: string; reason: string }[] = []
  const users: any[] = [], students: any[] = [], created: any[] = []

  for (const [i, raw] of parsed.data.entries()) {
    const n = i + 2 // spreadsheet row number (header is row 1)
    const res = row.safeParse(raw)
    const code = (raw.studentcode ?? '').trim()
    if (!res.success) { skipped.push({ row: n, studentCode: code, reason: 'Missing or invalid ' + Object.keys(res.error.flatten().fieldErrors).join(', ') }); continue }
    const d = res.data, classId = classes.get(d.class.toUpperCase())
    if (!classId) { skipped.push({ row: n, studentCode: code, reason: `Class "${d.class}" does not exist` }); continue }
    if (existing.has(d.studentcode) || seen.has(d.studentcode)) { skipped.push({ row: n, studentCode: code, reason: 'Student ID already exists' }); continue }
    seen.add(d.studentcode)
    const password = d.password || randomPassword(), userId = randomUUID()
    users.push({ id: userId, loginId: d.studentcode, passwordHash: await bcrypt.hash(password, 10), role: 'STUDENT', mustChangePw: !d.password })
    students.push({ userId, studentCode: d.studentcode, fullName: d.fullname, classId, gender: d.gender || null })
    created.push({ studentCode: d.studentcode, fullName: d.fullname, class: d.class, password: d.password ? undefined : password })
  }
  if (users.length) await db.$transaction([db.user.createMany({ data: users }), db.student.createMany({ data: students })])
  await audit('STUDENT_IMPORT', { created: created.length, skipped: skipped.length }, admin.id)
  return Response.json({ created, skipped })
})
