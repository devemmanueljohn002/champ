import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { createSession, handle } from '@/lib/auth'

const body = z.object({ loginId: z.string().trim().min(1).max(60), password: z.string().min(1).max(200) })

export const POST = handle(async (req) => {
  const { loginId, password } = body.parse(await req.json())
  const since = new Date(Date.now() - 15 * 60_000)
  const fails = await db.auditLog.count({ where: { action: 'LOGIN_FAIL', createdAt: { gte: since }, detail: { path: ['loginId'], equals: loginId } } })
  if (fails >= 5) return Response.json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, { status: 429 })
  const user = await db.user.findUnique({ where: { loginId } })
  const ok = !!user && user.active && (await bcrypt.compare(password, user.passwordHash))
  if (!ok) { await audit('LOGIN_FAIL', { loginId }); return Response.json({ error: 'Wrong ID or password' }, { status: 401 }) }
  await createSession(user.id)
  await audit('LOGIN', {}, user.id)
  return Response.json({ role: user.role })
})
