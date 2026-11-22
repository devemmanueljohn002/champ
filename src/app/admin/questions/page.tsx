'use client'

import { useEffect, useState } from 'react'

type Subject = { id: string; name: string }
type SchoolClass = { id: string; name: string }

export default function Questions() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    const [questionResponse, classResponse, subjectResponse] = await Promise.all([
      fetch('/api/admin/questions'),
      fetch('/api/admin/classes'),
      fetch('/api/admin/subjects'),
    ])
    if (questionResponse.ok) setRows(await questionResponse.json())
    if (classResponse.ok) setClasses(await classResponse.json())
    if (subjectResponse.ok) setSubjects(await subjectResponse.json())
  }

  useEffect(() => { void load() }, [])

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const labels = ['A', 'B', 'C', 'D']
    const correct = Number(form.get('correct'))
    const options = labels.map((label, index) => ({
      label,
      text: String(form.get(`option${index}`) || ''),
      isCorrect: index === correct,
    }))
    const response = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: form.get('text'),
        subjectId: form.get('subjectId'),
        classId: form.get('classId'),
        topic: form.get('topic') || undefined,
        difficulty: form.get('difficulty'),
        marks: Number(form.get('marks')),
        explanation: form.get('explanation') || undefined,
        imageUrl: form.get('imageUrl') || undefined,
        options,
      }),
    })
    const result = await response.json()
    setMessage(response.ok ? 'Question approved and added' : `Error: ${result.error}`)
    if (response.ok) {
      event.currentTarget.reset()
      await load()
    }
  }

  return (
    <main>
      <h1>Question bank</h1>
      <form onSubmit={add} className="card">
        <textarea name="text" placeholder="Question text" required style={{ width: '100%', minHeight: 100 }} />
        <div className="row">
          <select name="subjectId" required defaultValue=""><option value="" disabled>Subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          <select name="classId" required defaultValue=""><option value="" disabled>Class</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select>
          <input name="topic" placeholder="Topic" />
          <select name="difficulty" defaultValue="MEDIUM"><option>EASY</option><option>MEDIUM</option><option>HARD</option><option>EXPERT</option></select>
          <input name="marks" type="number" min="1" max="20" defaultValue="1" />
        </div>
        {[0, 1, 2, 3].map((index) => (
          <div className="row" key={index}>
            <label style={{ width: '100%' }}>
              <input type="radio" name="correct" value={index} defaultChecked={index === 0} /> Option {String.fromCharCode(65 + index)}
              <input name={`option${index}`} required style={{ width: '70%', marginLeft: 10 }} />
            </label>
          </div>
        ))}
        <input name="imageUrl" placeholder="Optional diagram/image URL" style={{ width: '100%' }} />
        <textarea name="explanation" placeholder="Answer explanation" style={{ width: '100%', marginTop: 10 }} />
        <button>Add approved question</button>
      </form>
      {message && <p role="status">{message}</p>}
      <h2>Question library</h2>
      {rows.length === 0 ? <p className="mut">No questions yet.</p> : (
        <table>
          <thead><tr><th>Question</th><th>Subject</th><th>Difficulty</th><th>Marks</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.text}</td><td>{row.subject.name}</td><td>{row.difficulty}</td><td>{row.marks}</td></tr>)}</tbody>
        </table>
      )}
    </main>
  )
}
