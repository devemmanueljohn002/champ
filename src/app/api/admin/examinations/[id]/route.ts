import { z } from 'zod'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { handle, requireRole } from '@/lib/auth'

const body = z.object({
  action: z.enum(['GO_LIVE', 'CLOSE', 'PUBLISH_RESULTS', 'CANCEL']),
})

export const PATCH = handle(async (req, { params }) => {
  const admin = await requireRole('ADMIN')
  const { action } = body.parse(await req.json())

  if (action === 'PUBLISH_RESULTS') {
    await db.$transaction([
      db.examination.update({ where: { id: params.id }, data: { resultsPublished: true } }),
      db.examinationResult.updateMany({ where: { examId: params.id }, data: { published: true } }),
    ])
    await audit('EXAM_RESULTS_PUBLISH', { examId: params.id }, admin.id)
  } else {
    const status = action === 'GO_LIVE' ? 'LIVE' : action === 'CLOSE' ? 'CLOSED' : 'CANCELLED'
    await db.examination.update({ where: { id: params.id }, data: { status } })
    await audit('EXAM_STATUS_UPDATE', { examId: params.id, status }, admin.id)
  }

  return Response.json({ ok: true })
})
