import { guard } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/LogoutButton'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard('ADMIN')
  return <div className="portal-grid"><aside className="side"><b style={{ color: 'var(--gold)' }}>Championship Admin</b>
    <Link href="/admin">Overview</Link><Link href="/admin/classes">Classes</Link><Link href="/admin/students">Students</Link>
    <Link href="/admin/questions">Question bank</Link><Link href="/admin/examinations">Examinations</Link><Link href="/leaderboard">Leaderboard</Link>
    <LogoutButton /></aside><div>{children}</div></div>
}
