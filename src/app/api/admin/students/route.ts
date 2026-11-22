import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, hashPassword, randomPassword, requireRole } from '@/lib/auth'

const body = z.object({
  studentCode: z.string().trim().min(2).max(40),
  fullName: z.string().trim().min(2).max(120),
  classId: z.string().min(1),
  gender: z.enum(['M', 'F']).optional(),
  password: z.string().min(6).max(100).optional(),
})

export const POST = handle(async (req) => {
  const admin = await requireRole('ADMIN')
  const d = body.parse(await req.json())
  const password = d.password ?? randomPassword()
  const passwordHash = await hashPassword(password)
  const student = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { loginId: d.studentCode, passwordHash, role: 'STUDENT', mustChangePw: !d.password } })
    return tx.student.create({ data: { userId: user.id, studentCode: d.studentCode, fullName: d.fullName, gender: d.gender, classId: d.classId } })
  })
  await audit('STUDENT_CREATE', { studentCode: d.studentCode, classId: d.classId }, admin.id)
  // Generated password is shown to the admin once and never stored in readable form
  return Response.json({ id: student.id, studentCode: d.studentCode, password: d.password ? undefined : password }, { status: 201 })
})

export const GET = handle(async () => {
  await requireRole('ADMIN')
  const rows = await db.student.findMany({
    include: {
      class: { select: { id: true, name: true } },
      user: { select: { active: true } },
    },
    orderBy: [{ class: { name: 'asc' } }, { fullName: 'asc' }],
  })
  return Response.json(rows.map((student) => ({
    id: student.id,
    studentCode: student.studentCode,
    fullName: student.fullName,
    gender: student.gender,
    isDemo: student.isDemo,
    class: student.class,
    active: student.user.active,
  })))
})
