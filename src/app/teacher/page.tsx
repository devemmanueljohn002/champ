import { guard } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await guard('TEACHER')
  const teacher = await db.teacher.findUnique({ where: { userId: user.id }, include: { classes: { include: { _count: { select: { students: true } } } } } })
  if (!teacher) return <main><h1>Teacher dashboard</h1><p className="mut">No teacher profile is linked to this account.</p></main>
  return <main><h1>Welcome, {teacher.fullName}</h1><p className="mut">Restricted view for your assigned classes.</p>
    <div className="cards">{teacher.classes.map((c)=><article className="card" key={c.id}><h3>{c.name}</h3><p>{c._count.students} registered students</p></article>)}</div>
  </main>
}
