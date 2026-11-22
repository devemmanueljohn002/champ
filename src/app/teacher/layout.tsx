import { guard } from '@/lib/auth'
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard('TEACHER')
  return <>{children}</>
}
