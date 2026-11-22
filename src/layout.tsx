import Link from 'next/link'
import { guard } from '@/lib/auth'
import LogoutButton from './LogoutButton'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard('ADMIN')
  return <>
    <nav className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', margin: 0, alignItems: 'center' }}>
      <b style={{ marginRight: 'auto', color: 'var(--gold)' }}>Admin</b>
      <Link href="/admin/classes">Classes</Link><Link href="/admin/students">Students</Link><LogoutButton />
    </nav>{children}</>
}
