import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const patch = z.object({ name: z.string().trim().min(2).max(20).optional(), category: z.enum(['JUNIOR', 'SENIOR']).optional(), teacherId: z.string().nullable().optional() })

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireRole('ADMIN')
  const data = patch.parse(await req.json())
  const row = await db.schoolClass.update({ where: { id: params.id }, data })
  await audit('CLASS_UPDATE', { id: params.id, ...data }, admin.id)
  return Response.json(row)
})

export const DELETE = handle(async (_req, { params }) => {
  const admin = await requireRole('ADMIN')
  const [students, exams] = await Promise.all([db.student.count({ where: { classId: params.id } }), db.examination.count({ where: { classId: params.id } })])
  if (students || exams) return Response.json({ error: 'This class has students or exams. Move or remove them first.' }, { status: 409 })
  await db.schoolClass.delete({ where: { id: params.id } })
  await audit('CLASS_DELETE', { id: params.id }, admin.id)
  return Response.json({ ok: true })
})
