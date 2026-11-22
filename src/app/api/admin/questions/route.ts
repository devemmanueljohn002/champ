import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const option = z.object({ label: z.enum(['A','B','C','D']), text: z.string().trim().min(1).max(1000), isCorrect: z.boolean() })
const body = z.object({
  text: z.string().trim().min(4).max(5000),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  topic: z.string().trim().optional(),
  difficulty: z.enum(['EASY','MEDIUM','HARD','EXPERT']),
  marks: z.number().int().min(1).max(20).default(1),
  explanation: z.string().trim().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  options: z.array(option).length(4).refine((v) => v.filter((o) => o.isCorrect).length === 1, 'Exactly one option must be correct'),
})

export const GET = handle(async (req) => {
  await requireRole('ADMIN')
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const rows = await db.question.findMany({
    where: status === 'APPROVED' ? { status: 'APPROVED' } : status === 'DRAFT' ? { status: 'DRAFT' } : undefined,
    include: { subject: true, topic: true, options: true },
    orderBy: { id: 'desc' },
  })
  return Response.json(rows.map((q) => ({ ...q, options: q.options.map((o) => ({ id:o.id,label:o.label,text:o.text,isCorrect:o.isCorrect })) })))
})

export const POST = handle(async (req) => {
  const admin = await requireRole('ADMIN')
  const d = body.parse(await req.json())
  const topic = d.topic ? await db.topic.upsert({ where: { subjectId_name: { subjectId:d.subjectId, name:d.topic } }, update: {}, create: { subjectId:d.subjectId, name:d.topic } }) : null
  const q = await db.question.create({ data: {
    text:d.text, subjectId:d.subjectId, classId:d.classId, topicId:topic?.id,
    difficulty:d.difficulty, marks:d.marks, explanation:d.explanation, imageUrl:d.imageUrl||null,
    status:'APPROVED',
    options:{ create:d.options },
  }, include:{ options:true }})
  await audit('QUESTION_CREATE',{questionId:q.id,classId:d.classId,subjectId:d.subjectId},admin.id)
  return Response.json(q,{status:201})
})
