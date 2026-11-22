import { db } from '@/lib/db'
import { handle, requireRole } from '@/lib/auth'
export const GET=handle(async()=>{await requireRole('ADMIN');return Response.json(await db.subject.findMany({orderBy:{name:'asc'}}))})
