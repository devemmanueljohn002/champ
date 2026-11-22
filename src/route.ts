import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, hashPassword, randomPassword, requireRole } from '@/lib/auth'

export const POST = handle(async (_req, { params }) => {
  const admin = await requireRole('ADMIN')
  const s = await db.student.findUniqueOrThrow({ where: { id: params.id } })
  const password = randomPassword()
  await db.$transaction([
    db.user.update({ where: { id: s.userId }, data: { passwordHash: await hashPassword(password), mustChangePw: true } }),
    db.session.deleteMany({ where: { userId: s.userId } }),
  ])
  await audit('STUDENT_PASSWORD_RESET', { id: params.id, studentCode: s.studentCode }, admin.id)
  return Response.json({ studentCode: s.studentCode, password }) // shown once
})
