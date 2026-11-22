# Inter-Class Mathematics & ICT Championship (Phase 1 scaffold)

Stack: Next.js 14, TypeScript, Tailwind, PostgreSQL, Prisma.

## Setup
1. `cp .env.example .env` and fill in DATABASE_URL and SESSION_SECRET
2. `npm install`
3. `npm run db:deploy` to apply the generated PostgreSQL migration
4. `npm run db:seed` with real `ADMIN_LOGIN` and `ADMIN_PASSWORD` values
5. `npm run dev`

## Rules built into the schema
- One exam session and one result per student per exam (unique constraints)
- Server sets `deadlineAt`; never trust browser time or scores
- `QuestionOption.isCorrect` must never be returned by student-facing APIs
- Demo rows carry `isDemo` so they can be deleted before launch

## Next steps
Done: auth, roles, class API and page, student create API, seed. Next: student list/bulk import, teacher assignment, then the CBT engine.

## First login
Set ADMIN_LOGIN / ADMIN_PASSWORD in `.env`, run `npm run db:seed`, then sign in at `/login`.
Security notes: passwords hashed with bcrypt (cost 12); session cookie is httpOnly and only its SHA-256 hash is stored; 5 failed logins per ID in 15 minutes locks that ID temporarily; all class and student changes go to the audit log.
