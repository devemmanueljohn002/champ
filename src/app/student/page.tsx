import { guard } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await guard('STUDENT')
  const student = await db.student.findUnique({ where: { userId: user.id }, include: { class: true } })
  if (!student) return <main><h1>Account setup required</h1><p className="mut">No student profile is linked to this account.</p></main>
  const exams = await db.examination.findMany({ where: { classId: student.classId, status: { in: ['LIVE','SCHEDULED'] } }, include: { round: true, _count: { select: { questions: true } } }, orderBy: { startsAt: 'asc' } })
  const results = await db.examinationResult.findMany({ where: { studentId: student.id, published: true }, include: { exam: true }, orderBy: { exam: { endsAt: 'desc' } }, take: 10 })
  return <main className="portal-main"><h1>Welcome, {student.fullName}</h1><p className="mut">{student.class.name} · Student ID {student.studentCode}</p>
    <div className="kpis"><div className="kpi"><b>{exams.length}</b><span>Available examinations</span></div><div className="kpi"><b>{results.length}</b><span>Published results</span></div><div className="kpi"><b>{student.class.name}</b><span>Assigned class</span></div></div>
    <h2 style={{ marginTop: 28 }}>Competition examinations</h2>
    {exams.length === 0 ? <p className="mut">No examinations are available for your class.</p> : exams.map((exam) => <article className="card" key={exam.id}>
      <h3>{exam.title}</h3><p>{exam.round?.name ?? 'Championship round'} · {exam.durationMin} minutes · {_countQuestions(exam)} questions</p>
      <p className="mut">Starts {exam.startsAt.toLocaleString()} · Ends {exam.endsAt.toLocaleString()}</p>
      <Link href={`/student/exam/${exam.id}`}><button>ENTER EXAMINATION</button></Link>
    </article>)}
    <h2 style={{ marginTop: 28 }}>Recent results</h2>{results.length === 0 ? <p className="mut">Published results will appear here.</p> : results.map((r)=><div className="card" key={r.id}>{r.exam.title}: <b>{r.score}/{r.total}</b> ({Math.round(r.score/r.total*100)}%)</div>)}
  </main>
}
function _countQuestions(exam: { _count: { questions: number } }) { return exam._count.questions }
