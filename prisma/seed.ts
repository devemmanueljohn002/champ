import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const db = new PrismaClient()
async function main() {
  const loginId = process.env.ADMIN_LOGIN, pw = process.env.ADMIN_PASSWORD
  if (!loginId || !pw || pw.startsWith('change-me')) throw new Error('Set ADMIN_LOGIN and a real ADMIN_PASSWORD in .env first')
  await db.user.upsert({
    where: { loginId }, update: {},
    create: { loginId, passwordHash: await bcrypt.hash(pw, 12), role: 'ADMIN', admin: { create: { fullName: 'Administrator' } } },
  })
  for (const name of ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'])
    await db.schoolClass.upsert({ where: { name }, update: {}, create: { name, category: name.startsWith('JSS') ? 'JUNIOR' : 'SENIOR' } })
  for (const name of ['Mathematics', 'ICT / Data Processing']) await db.subject.upsert({ where: { name }, update: {}, create: { name } })
  console.log('Seeded: 1 admin, 6 classes, 2 subjects. GS1 can be added from the admin Classes page.')
}
main().finally(() => db.$disconnect())
