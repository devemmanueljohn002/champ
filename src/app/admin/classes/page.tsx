'use client'
import { useCallback, useEffect, useState } from 'react'
type C = { id: string; name: string; category: string; _count: { students: number } }
export default function Classes() {
  const [rows, setRows] = useState<C[] | null>(null); const [msg, setMsg] = useState('')
  const load = useCallback(async () => { const r = await fetch('/api/admin/classes'); if (r.status === 401) location.href = '/login'; else setRows(await r.json()) }, [])
  useEffect(() => { load() }, [load])
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const r = await fetch('/api/admin/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.get('name'), category: f.get('category') }) })
    const j = await r.json(); setMsg(r.ok ? 'Class created' : j.error); if (r.ok) { (e.target as HTMLFormElement).reset(); load() }
  }
  async function del(id: string) {
    if (!confirm('Delete this class?')) return
    const r = await fetch('/api/admin/classes/' + id, { method: 'DELETE' }); const j = await r.json()
    setMsg(r.ok ? 'Class deleted' : j.error); load()
  }
  async function rename(c: C) {
    const name = prompt('New class name', c.name); if (!name || name === c.name) return
    const r = await fetch('/api/admin/classes/' + c.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setMsg(r.ok ? 'Class renamed' : (await r.json()).error); load()
  }
  return <main><h1>Classes</h1>
    <form onSubmit={add} className="row"><input name="name" placeholder="e.g. GS1" required /><select name="category"><option>JUNIOR</option><option>SENIOR</option></select><button>Add class</button></form>
    {msg && <p role="status" className="mut">{msg}</p>}
    {rows === null ? <p className="mut">Loading…</p> : rows.length === 0 ? <p className="mut">No classes yet. Add your first class above.</p> :
      <table><thead><tr><th>Class</th><th>Category</th><th>Students</th><th></th></tr></thead><tbody>
        {rows.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.category}</td><td>{c._count.students}</td>
          <td><button className="sec" onClick={() => rename(c)}>Rename</button> <button className="sec" onClick={() => del(c.id)}>Delete</button></td></tr>)}
      </tbody></table>}
  </main>
}
