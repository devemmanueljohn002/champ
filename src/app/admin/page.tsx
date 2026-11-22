import { guard } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  await guard('ADMIN')
  const [students, classes, exams, questions, published, active] = await Promise.all([
    db.student.count(), db.schoolClass.count(), db.examination.count(), db.question.count(),
    db.examinationResult.count({ where: { published: true } }), db.examination.count({ where: { status: 'LIVE' } }),
  ])
  return <main className="portal-main"><h1>Competition control centre</h1><p className="mut">Manage the championship and monitor its live status.</p>
    <div className="kpis">
      <div className="kpi"><b>{students}</b><span>Registered students</span></div><div className="kpi"><b>{classes}</b><span>Classes</span></div>
      <div className="kpi"><b>{exams}</b><span>Examinations</span></div><div className="kpi"><b>{questions}</b><span>Approved questions</span></div>
      <div className="kpi"><b>{active}</b><span>Active examinations</span></div><div className="kpi"><b>{published}</b><span>Published results</span></div>
    </div>
    <section className="cards" style={{ marginTop: 20 }}>
      <Link className="card" href="/admin/students"><h3>Student management</h3><p>Register, import, edit and reset student accounts.</p></Link>
      <Link className="card" href="/admin/classes"><h3>Class management</h3><p>Create participating classes and review populations.</p></Link>
      <Link className="card" href="/admin/questions"><h3>Question bank</h3><p>Create and approve curriculum-aligned questions.</p></Link>
    </section>
  </main>
}
