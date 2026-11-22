import { z } from 'zod'
import { db } from '@/lib/db'
import { handle, requireRole } from '@/lib/auth'

const actionBody = z.object({
  action: z.enum(['start', 'save', 'submit', 'visibility']),
  questionId: z.string().optional(),
  optionId: z.string().optional(),
  flagged: z.boolean().optional(),
})

export const GET = handle(async (_req, { params }) => {
  const user = await requireRole('STUDENT')
  const student = await db.student.findUnique({ where: { userId: user.id } })
  if (!student) throw new Error('Student profile missing')
  const exam = await db.examination.findUnique({ where: { id: params.examId }, include: { questions: { include: { question: { include: { options: true, topic: true } } } } } })
  if (!exam || exam.classId !== student.classId) return Response.json({ error: 'Examination unavailable' }, { status: 403 })
  const now = new Date()
  let session = await db.examinationSession.findUnique({ where: { examId_studentId: { examId: exam.id, studentId: student.id } }, include: { answers: true } })
  if (session && session.status === 'IN_PROGRESS' && session.deadlineAt <= now) session = await submitSession(session.id)
  if (!session || session.status !== 'IN_PROGRESS') {
    const result = await db.examinationResult.findUnique({ where: { examId_studentId: { examId: exam.id, studentId: student.id } } })
    return Response.json({ exam: publicExam(exam), session: null, submitted: true, result: result ? { score: result.score, total: result.total, published: result.published } : null })
  }
  const order = session.questionOrder as string[]
  const questions = order.map((id) => exam.questions.find((q) => q.questionId === id)?.question).filter(Boolean)
  return Response.json({
    exam: publicExam(exam),
    session: { startedAt: session.startedAt, deadlineAt: session.deadlineAt, status: session.status, tabSwitches: session.tabSwitches },
    questions: questions.map((q: any) => {
      const options = q.options.map((o: any) => ({ id: o.id, label: o.label, text: o.text }))
      if (exam.shuffleOptions) shuffleDeterministic(options, `${session.id}:${q.id}`)
      return { id: q.id, text: q.text, type: q.type, imageUrl: q.imageUrl, topic: q.topic?.name, options }
    }),
    answers: session.answers.map((a) => ({ questionId: a.questionId, optionId: a.optionId, flagged: a.flagged })),
  })
})

export const POST = handle(async (req, { params }) => {
  const user = await requireRole('STUDENT')
  const student = await db.student.findUnique({ where: { userId: user.id } })
  if (!student) throw new Error('Student profile missing')
  const data = actionBody.parse(await req.json())
  const exam = await db.examination.findUnique({ where: { id: params.examId }, include: { questions: true } })
  if (!exam || exam.classId !== student.classId) return Response.json({ error: 'Examination unavailable' }, { status: 403 })
  const now = new Date()
  if (now < exam.startsAt) return Response.json({ error: 'Examination has not started' }, { status: 409 })
  if (now > exam.endsAt) return Response.json({ error: 'Examination has closed' }, { status: 409 })
  let session = await db.examinationSession.findUnique({ where: { examId_studentId: { examId: exam.id, studentId: student.id } } })
  if (data.action === 'start') {
    if (session) return Response.json({ started: true })
    const ids = exam.questions.map((q) => q.questionId)
    if (exam.shuffleQuestions) shuffle(ids)
    const durationDeadline = new Date(now.getTime() + exam.durationMin * 60_000)
    const deadlineAt = durationDeadline < exam.endsAt ? durationDeadline : exam.endsAt
    session = await db.examinationSession.create({ data: { examId: exam.id, studentId: student.id, deadlineAt, questionOrder: ids } })
    return Response.json({ started: true, deadlineAt: session.deadlineAt })
  }
  if (!session) return Response.json({ error: 'Start the examination first' }, { status: 409 })
  if (session.status !== 'IN_PROGRESS') return Response.json({ submitted: true }, { status: 409 })
  if (session.deadlineAt <= now) { await submitSession(session.id); return Response.json({ submitted: true }) }
  if (data.action === 'visibility') {
    await db.examinationSession.update({ where: { id: session.id }, data: { tabSwitches: { increment: 1 } } })
    return Response.json({ recorded: true })
  }
  if (data.action === 'save') {
    if (!data.questionId) return Response.json({ error: 'Question is required' }, { status: 400 })
    const examQuestion = exam.questions.find((q) => q.questionId === data.questionId)
    if (!examQuestion) return Response.json({ error: 'Question is not part of this examination' }, { status: 400 })
    if (data.optionId) {
      const option = await db.questionOption.findUnique({ where: { id: data.optionId }, select: { questionId: true } })
      if (!option || option.questionId !== data.questionId) return Response.json({ error: 'Invalid answer option' }, { status: 400 })
    }
    await db.studentAnswer.upsert({
      where: { sessionId_questionId: { sessionId: session.id, questionId: data.questionId } },
      update: { optionId: data.optionId ?? null, flagged: data.flagged ?? false },
      create: { sessionId: session.id, questionId: data.questionId, optionId: data.optionId ?? null, flagged: data.flagged ?? false },
    })
    return Response.json({ saved: true })
  }
  if (data.action === 'submit') {
    await submitSession(session.id)
    return Response.json({ submitted: true })
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 })
})

function shuffle<T>(values: T[]) { for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]] } }
function shuffleDeterministic<T>(values: T[], seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  for (let i = values.length - 1; i > 0; i--) {
    hash ^= hash << 13; hash ^= hash >>> 17; hash ^= hash << 5
    const j = (hash >>> 0) % (i + 1)
    ;[values[i], values[j]] = [values[j], values[i]]
  }
}
function publicExam(exam: any) { return { id: exam.id, title: exam.title, durationMin: exam.durationMin, startsAt: exam.startsAt, endsAt: exam.endsAt } }

async function submitSession(sessionId: string) {
  return db.$transaction(async (tx) => {
    const session = await tx.examinationSession.findUnique({ where: { id: sessionId }, include: { exam: { include: { questions: { include: { question: { include: { options: true } } } } } }, student: true, answers: true } })
    if (!session || session.status !== 'IN_PROGRESS') return session
    let score = 0, correct = 0, incorrect = 0
    for (const answer of session.answers) {
      if (!answer.optionId) continue
      const link = session.exam.questions.find((q) => q.questionId === answer.questionId)
      const option = link?.question.options.find((o) => o.id === answer.optionId)
      if (option?.isCorrect) { correct++; score += link?.question.marks ?? 1 } else { incorrect++ }
    }
    if (session.exam.negativeMarking) score = Math.max(0, score - incorrect)
    const total = session.exam.questions.reduce((sum, q) => sum + q.question.marks, 0)
    const unanswered = session.exam.questions.length - session.answers.filter((a) => a.optionId).length
    await tx.examinationSession.update({ where: { id: sessionId }, data: { status: 'SUBMITTED' } })
    await tx.examinationResult.upsert({
      where: { examId_studentId: { examId: session.examId, studentId: session.studentId } },
      update: { score, total, correct, incorrect, unanswered, timeSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000)) },
      create: { examId: session.examId, studentId: session.studentId, score, total, correct, incorrect, unanswered, timeSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000)) },
    })
    return session
  })
}
