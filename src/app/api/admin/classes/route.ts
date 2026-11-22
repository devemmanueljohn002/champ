import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const body = z.object({ name: z.string().trim().min(2).max(20), category: z.enum(['JUNIOR', 'SENIOR']) })

export const GET = handle(async () => {
  await requireRole('ADMIN')
  const rows = await db.schoolClass.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { students: true } }, teacher: { select: { fullName: true } } } })
  return Response.json(rows)
})

export const POST = handle(async (req) => {
  const admin = await requireRole('ADMIN')
  const data = body.parse(await req.json())
  const row = await db.schoolClass.create({ data })
  await audit('CLASS_CREATE', data, admin.id)
  return Response.json(row, { status: 201 })
})
