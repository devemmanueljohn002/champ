'use client'

import { useCallback, useEffect, useState } from 'react'

type SchoolClass = { id: string; name: string }
type Student = {
  id: string
  studentCode: string
  fullName: string
  gender: string | null
  isDemo: boolean
  active: boolean
  class: SchoolClass
}

export default function StudentsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [rows, setRows] = useState<Student[]>([])
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const [classesResponse, studentsResponse] = await Promise.all([
      fetch('/api/admin/classes'),
      fetch('/api/admin/students'),
    ])
    if (classesResponse.ok) setClasses(await classesResponse.json())
    if (studentsResponse.ok) setRows(await studentsResponse.json())
  }, [])

  useEffect(() => { void load() }, [load])

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode: form.get('studentCode'),
        fullName: form.get('fullName'),
        classId: form.get('classId'),
        gender: form.get('gender') || undefined,
      }),
    })
    const result = await response.json()
    if (response.ok) {
      setMessage(`Student created. Temporary password: ${result.password}`)
      event.currentTarget.reset()
      await load()
    } else {
      setMessage(result.error)
    }
  }

  return (
    <main>
      <h1>Student management</h1>
      <form onSubmit={add} className="card">
        <div className="row">
          <input name="studentCode" placeholder="Student ID" required />
          <input name="fullName" placeholder="Full name" required />
          <select name="classId" required defaultValue="">
            <option value="" disabled>Assign class</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="gender" defaultValue="">
            <option value="">Gender (optional)</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          <button>Add student</button>
        </div>
      </form>
      {message && <p role="status">{message}</p>}
      {rows.length === 0 ? <p className="mut">No students registered.</p> : (
        <table>
          <thead><tr><th>Student ID</th><th>Full name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td>{row.studentCode}</td><td>{row.fullName}</td><td>{row.class.name}</td>
              <td>{row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : '—'}</td>
              <td>{row.active ? 'Active' : 'Disabled'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </main>
  )
}
