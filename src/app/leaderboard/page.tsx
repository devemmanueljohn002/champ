import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Leaderboard() {
  const results = await db.examinationResult.findMany({
    where: { published: true },
    include: { student: { include: { class: true } }, exam: true },
    orderBy: [{ score: 'desc' }, { timeSeconds: 'asc' }],
    take: 50,
  })
  return <main><h1>Championship leaderboard</h1><p className="mut">Rankings from published examination results only.</p>
    {results.length === 0 ? <p className="mut">No published results are available yet.</p> : <table><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Examination</th><th>Score</th><th>Time</th></tr></thead><tbody>
      {results.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{r.student.fullName}</td><td>{r.student.class.name}</td><td>{r.exam.title}</td><td><b>{r.score}/{r.total}</b></td><td>{Math.floor(r.timeSeconds/60)}m {r.timeSeconds%60}s</td></tr>)}
    </tbody></table>}
  </main>
}
