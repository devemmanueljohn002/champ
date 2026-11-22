import { guard } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/LogoutButton'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard('STUDENT')
  return <div className="portal-grid"><aside className="side"><b style={{ color: 'var(--gold)' }}>Student Portal</b><Link href="/student">Dashboard</Link><Link href="/leaderboard">Leaderboard</Link><LogoutButton /></aside><div>{children}</div></div>
}
