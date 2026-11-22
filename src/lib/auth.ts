import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { ZodError } from 'zod'
import type { Role } from '@prisma/client'
import { db } from './db'

export const COOKIE = 'sid'
const DAYS = 7
const hash = (t: string) => createHash('sha256').update(t).digest('hex')

export class HttpError extends Error { constructor(public status: number) { super(String(status)) } }
export const hashPassword = (p: string) => bcrypt.hash(p, 12)
export const randomPassword = () => randomBytes(6).toString('base64url')

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  await db.session.create({ data: { id: hash(token), userId, expiresAt: new Date(Date.now() + DAYS * 864e5) } })
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: DAYS * 86400, secure: process.env.NODE_ENV === 'production' })
}

export async function destroySession() {
  const t = cookies().get(COOKIE)?.value
  if (t) await db.session.deleteMany({ where: { id: hash(t) } })
  cookies().delete(COOKIE)
}

export async function currentUser() {
  const t = cookies().get(COOKIE)?.value
  if (!t) return null
  const s = await db.session.findUnique({ where: { id: hash(t) }, include: { user: true } })
  if (!s || s.expiresAt < new Date() || !s.user.active) return null
  return s.user
}

// For API routes: throws 401/403
export async function requireRole(...roles: Role[]) {
  const u = await currentUser()
  if (!u) throw new HttpError(401)
  if (!roles.includes(u.role)) throw new HttpError(403)
  return u
}

// For pages/layouts: redirects to login
export async function guard(...roles: Role[]) {
  const u = await currentUser()
  if (!u || !roles.includes(u.role)) redirect('/login')
  return u
}

// Wraps route handlers with consistent error responses
export const handle = (fn: (req: Request, ctx: any) => Promise<Response>) => async (req: Request, ctx: any) => {
  try { return await fn(req, ctx) }
  catch (e: any) {
    if (e instanceof HttpError) return Response.json({ error: e.status === 401 ? 'Sign in required' : 'You do not have access to this' }, { status: e.status })
    if (e instanceof ZodError) return Response.json({ error: 'Check the highlighted fields', issues: e.flatten().fieldErrors }, { status: 400 })
    if (e?.code === 'P2002') return Response.json({ error: 'That value is already in use' }, { status: 409 })
    if (e?.code === 'P2025') return Response.json({ error: 'Not found' }, { status: 404 })
    console.error(e)
    return Response.json({ error: 'Something went wrong on the server' }, { status: 500 })
  }
}
