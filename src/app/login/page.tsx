'use client'
import { useState } from 'react'
export default function Login() {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('')
    const f = new FormData(e.currentTarget)
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: f.get('loginId'), password: f.get('password') }) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) return setErr(j.error ?? 'Could not sign in')
    location.href = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }[j.role as 'ADMIN'] 
  }
  return <main style={{ maxWidth: 380 }}><h1>Sign in</h1>
    <form onSubmit={submit} className="row" style={{ flexDirection: 'column' }}>
      <label>Student ID or staff ID<input name="loginId" required autoComplete="username" style={{ width: '100%' }} /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" style={{ width: '100%' }} /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form></main>
}
