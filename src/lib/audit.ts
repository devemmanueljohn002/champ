import { db } from './db'
export const audit = (action: string, detail: object = {}, actorId?: string) =>
  db.auditLog.create({ data: { action, detail, actorId } })
