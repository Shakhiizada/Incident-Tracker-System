# SecureTracker — Электронный журнал регистрации инцидентов ИБ

Russian-language Information Security Incident Management System.

## Stack
- pnpm monorepo
- Frontend: React + Vite + wouter + TanStack Query + Recharts + Framer Motion + Tailwind
- Backend: Express 5 + Drizzle ORM + PostgreSQL
- Auth: custom session-based (cookies + bcryptjs), seeded test accounts
- API contract: OpenAPI (lib/api-spec) → Zod (lib/api-zod) + Orval client (lib/api-client-react)

## Artifacts
- `securetracker` (web, /) — main React app
- `api-server` (api) — Express backend on /api
- `mockup-sandbox` (design) — component preview server

## Test accounts
- admin@company.com / admin123 (admin)
- analyst@company.com / analyst123 (analyst)
- employee@company.com / employee123 (employee)

## Roles
- **employee**: create incidents, view, comment
- **analyst**: + edit status/assignee/severity, escalate, see audit
- **admin**: full access including user oversight

## Features
- Login + session cookie auth
- Dashboard: KPI tiles, timeline area chart, severity pie, type bar chart, recent activity
- Incidents list with filters (status, severity, type, search)
- Incident detail with comments + per-incident audit log
- New incident form (type/severity/description/assignee)
- Global audit log (admin/analyst)
- Incident escalation
- Russian labels everywhere

## Scripts
- `pnpm --filter @workspace/scripts run seed` — seed users + sample incidents
- `pnpm --filter @workspace/db run push` — push schema to DB

## Layout notes
- `lib/db/src/schema/` — drizzle tables (users, incidents, comments, audit, sessions)
- `artifacts/api-server/src/routes/` — auth, users, incidents, comments, audit, stats
- `artifacts/api-server/src/lib/auth.ts` — session helpers
- `artifacts/securetracker/src/pages/` — login, dashboard, incidents, new-incident, incident-detail, audit
- `artifacts/securetracker/src/lib/labels.ts` — Russian enum translations
