'use client'

import { useEffect, useState } from 'react'

export default function Examinations() {
  const [classes, setClasses] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    const [classResponse, examResponse] = await Promise.all([
      fetch('/api/admin/classes'),
      fetch('/api/admin/examinations'),
    ])
    if (classResponse.ok) setClasses(await classResponse.json())
    if (examResponse.ok) setRows(await examResponse.json())
  }

  useEffect(() => { void load() }, [])

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/admin/examinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        classId: form.get('classId'),
        durationMin: Number(form.get('durationMin')),
        startsAt: form.get('startsAt'),
        endsAt: form.get('endsAt'),
        questionCount: Number(form.get('questionCount')),
        negativeMarking: form.get('negativeMarking') === 'on',
        shuffleQuestions: form.get('shuffleQuestions') === 'on',
        shuffleOptions: form.get('shuffleOptions') === 'on',
      }),
    })
    const result = await response.json()
    setMessage(response.ok ? 'Examination scheduled' : `Error: ${result.error}`)
    if (response.ok) {
      event.currentTarget.reset()
      await load()
    }
  }

  async function action(id: string, action: 'GO_LIVE' | 'CLOSE' | 'PUBLISH_RESULTS' | 'CANCEL') {
    if (action === 'CANCEL' && !confirm('Cancel this examination?')) return
    const response = await fetch(`/api/admin/examinations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const result = await response.json()
    setMessage(response.ok ? 'Examination updated' : `Error: ${result.error}`)
    if (response.ok) await load()
  }

  return (
    <main>
      <h1>Examination management</h1>
      <form onSubmit={add} className="card">
        <div className="row">
          <input name="title" placeholder="Examination title" required />
          <select name="classId" required defaultValue=""><option value="" disabled>Class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input name="durationMin" type="number" min="1" max="300" defaultValue="40" />
          <input name="questionCount" type="number" min="1" max="200" defaultValue="40" />
        </div>
        <div className="row">
          <label>Starts<input name="startsAt" type="datetime-local" required /></label>
          <label>Ends<input name="endsAt" type="datetime-local" required /></label>
        </div>
        <div className="row">
          <label><input name="shuffleQuestions" type="checkbox" defaultChecked /> Shuffle questions</label>
          <label><input name="shuffleOptions" type="checkbox" defaultChecked /> Shuffle options</label>
          <label><input name="negativeMarking" type="checkbox" /> Negative marking</label>
        </div>
        <button>Schedule examination</button>
      </form>
      {message && <p role="status">{message}</p>}
      <h2>Scheduled examinations</h2>
      {rows.length === 0 ? <p className="mut">No examinations scheduled.</p> : (
        <table>
          <thead><tr><th>Title</th><th>Class</th><th>Status</th><th>Questions</th><th>Schedule</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td><td>{row.class.name}</td><td>{row.status}</td><td>{row._count.questions}</td>
              <td>{new Date(row.startsAt).toLocaleString()}</td>
              <td>
                {row.status !== 'LIVE' && row.status !== 'CLOSED' && row.status !== 'CANCELLED' && <button className="sec" onClick={() => action(row.id, 'GO_LIVE')}>Go live</button>}
                {(row.status === 'LIVE' || row.status === 'SCHEDULED') && <button className="sec" onClick={() => action(row.id, 'CLOSE')} style={{ marginLeft: 6 }}>Close</button>}
                {row.status === 'CLOSED' && !row.resultsPublished && <button onClick={() => action(row.id, 'PUBLISH_RESULTS')} style={{ marginLeft: 6 }}>Publish results</button>}
                {row.status !== 'CANCELLED' && row.status !== 'CLOSED' && <button className="sec" onClick={() => action(row.id, 'CANCEL')} style={{ marginLeft: 6 }}>Cancel</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </main>
  )
}
