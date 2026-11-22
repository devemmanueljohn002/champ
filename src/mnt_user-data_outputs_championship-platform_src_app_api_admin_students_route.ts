import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, hashPassword, randomPassword, requireRole } from '@/lib/auth'

const PAGE = 20
const SORTS = ['fullName', 'studentCode', 'class'] as const

export const GET = handle(async (req) => {
  await requireRole('ADMIN')
  const p = new URL(req.url).searchParams
  const q = p.get('q')?.trim(), classId = p.get('classId') || undefined
  const sort = SORTS.find((s) => s === p.get('sort')) ?? 'fullName'
  const dir = p.get('dir') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(p.get('page')) || 1)
  const where = {
    ...(classId && { classId }),
    ...(q && { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { studentCode: { contains: q, mode: 'insensitive' as const } }] }),
  }
  const [total, rows] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where, skip: (page - 1) * PAGE, take: PAGE,
      orderBy: sort === 'class' ? { class: { name: dir } } : { [sort]: dir },
      select: { id: true, studentCode: true, fullName: true, gender: true, classId: true, class: { select: { name: true } }, user: { select: { active: true } } },
    }),
  ])
  return Response.json({ rows, total, page, pageSize: PAGE })
})

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
  return Response.json({ id: student.id, studentCode: d.studentCode, password: d.password ? undefined : password }, { status: 201 })
})
