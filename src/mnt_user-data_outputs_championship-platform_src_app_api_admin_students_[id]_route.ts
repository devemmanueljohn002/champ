import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const patch = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  classId: z.string().min(1).optional(),
  gender: z.enum(['M', 'F']).nullable().optional(),
  active: z.boolean().optional(),
})

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireRole('ADMIN')
  const { active, ...fields } = patch.parse(await req.json())
  const student = await db.$transaction(async (tx) => {
    const s = await tx.student.update({ where: { id: params.id }, data: fields })
    if (active !== undefined) {
      await tx.user.update({ where: { id: s.userId }, data: { active } })
      if (!active) await tx.session.deleteMany({ where: { userId: s.userId } }) // sign them out immediately
    }
    return s
  })
  await audit('STUDENT_UPDATE', { id: params.id, ...fields, active }, admin.id)
  return Response.json({ id: student.id })
})
