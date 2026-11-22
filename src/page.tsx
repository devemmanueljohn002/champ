'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
type S = { id: string; studentCode: string; fullName: string; classId: string; class: { name: string }; user: { active: boolean } }
type Cls = { id: string; name: string }
type Imp = { created: { studentCode: string; fullName: string; class: string; password?: string }[]; skipped: { row: number; studentCode: string; reason: string }[] }
const post = (url: string, body?: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) })

export default function Students() {
  const [data, setData] = useState<{ rows: S[]; total: number; pageSize: number } | null>(null)
  const [classes, setClasses] = useState<Cls[]>([])
  const [q, setQ] = useState(''), [classId, setClassId] = useState(''), [sort, setSort] = useState('fullName'), [dir, setDir] = useState('asc'), [page, setPage] = useState(1)
  const [msg, setMsg] = useState(''), [imp, setImp] = useState<Imp | null>(null), [busy, setBusy] = useState(false)
  const timer = useRef<any>()

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/students?${new URLSearchParams({ q, classId, sort, dir, page: String(page) })}`)
    if (r.status === 401) return void (location.href = '/login')
    setData(await r.json())
  }, [q, classId, sort, dir, page])
  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 250) }, [load])
  useEffect(() => { fetch('/api/admin/classes').then((r) => r.json()).then(setClasses) }, [])

  const head = (key: string, label: string) =>
    <th><button className="sec" onClick={() => { setDir(sort === key && dir === 'asc' ? 'desc' : 'asc'); setSort(key); setPage(1) }}>{label}{sort === key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)) as any
    if (!f.gender) delete f.gender; if (!f.password) delete f.password
    const r = await post('/api/admin/students', f), j = await r.json()
    if (!r.ok) return setMsg(j.error)
    setMsg(j.password ? `Student added. Password (shown once): ${j.password}` : 'Student added'); (e.target as HTMLFormElement).reset(); load()
  }
  async function toggle(s: S) {
    const r = await fetch('/api/admin/students/' + s.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !s.user.active }) })
    setMsg(r.ok ? (s.user.active ? 'Account deactivated' : 'Account reactivated') : (await r.json()).error); load()
  }
  async function move(s: S, classId: string) {
    const r = await fetch('/api/admin/students/' + s.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId }) })
    setMsg(r.ok ? 'Class changed' : (await r.json()).error); load()
  }
  async function reset(s: S) {
    if (!confirm(`Reset the password for ${s.fullName}?`)) return
    const r = await post(`/api/admin/students/${s.id}/reset-password`), j = await r.json()
    setMsg(r.ok ? `New password for ${j.studentCode} (shown once): ${j.password}` : j.error)
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setImp(null); setMsg('')
    const r = await post('/api/admin/students/import', { csv: await file.text() }), j = await r.json()
    setBusy(false); e.target.value = ''
    if (!r.ok) return setMsg(j.error)
    setImp(j); setMsg(`Imported ${j.created.length} students, skipped ${j.skipped.length}`); load()
  }
  function downloadCreds() {
    const lines = ['studentCode,fullName,class,password', ...imp!.created.map((c) => [c.studentCode, `"${c.fullName.replace(/"/g, '""')}"`, c.class, c.password ?? '(set by admin)'].join(','))]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'new-student-credentials.csv'; a.click()
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return <main><h1>Students</h1>
    <form onSubmit={add} className="row">
      <input name="studentCode" placeholder="Student ID" required /><input name="fullName" placeholder="Full name" required />
      <select name="classId" required defaultValue=""><option value="" disabled>Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select name="gender" defaultValue=""><option value="">Gender (optional)</option><option value="M">Male</option><option value="F">Female</option></select>
      <input name="password" placeholder="Password (blank = generate)" /><button>Add student</button>
    </form>
    <div className="row">
      <label className="mut">Import CSV <input type="file" accept=".csv,text/csv" onChange={upload} disabled={busy} /></label>
      <a href="/api/admin/students/export"><button className="sec" type="button">Export CSV</button></a>
      <span className="mut">Columns: studentCode, fullName, class, gender, password (last two optional)</span>
    </div>
    {msg && <p role="status">{msg}</p>}
    {imp && <section>{imp.created.length > 0 && <button onClick={downloadCreds}>Download new passwords</button>}
      {imp.skipped.length > 0 && <table><thead><tr><th>Row</th><th>Student ID</th><th>Why it was skipped</th></tr></thead><tbody>{imp.skipped.map((s) => <tr key={s.row}><td>{s.row}</td><td>{s.studentCode}</td><td>{s.reason}</td></tr>)}</tbody></table>}</section>}
    <div className="row"><input placeholder="Search name or ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search students" />
      <select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1) }} aria-label="Filter by class"><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    {data === null ? <p className="mut">Loading…</p> : data.rows.length === 0 ? <p className="mut">No students match. Add one above or import a CSV.</p> :
      <table><thead><tr>{head('studentCode', 'ID')}{head('fullName', 'Name')}{head('class', 'Class')}<th>Status</th><th></th></tr></thead><tbody>
        {data.rows.map((s) => <tr key={s.id}><td>{s.studentCode}</td><td>{s.fullName}</td>
          <td><select value={s.classId} onChange={(e) => move(s, e.target.value)} aria-label={'Class for ' + s.fullName}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
          <td>{s.user.active ? 'Active' : 'Deactivated'}</td>
          <td><button className="sec" onClick={() => reset(s)}>Reset password</button> <button className="sec" onClick={() => toggle(s)}>{s.user.active ? 'Deactivate' : 'Reactivate'}</button></td></tr>)}
      </tbody></table>}
    <div className="row"><button className="sec" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="mut">Page {page} of {pages} · {data?.total ?? 0} students</span><button className="sec" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
  </main>
}
