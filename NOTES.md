# Notes

## Demo login

After running the seed (`npm run prisma:seed` locally, or automatically via Docker on startup), use any of these accounts:

| Email | Password |
|-------|----------|
| `operator@example.com` | `password123` |
| `maria.santos@example.com` | `password123` |
| `james.chen@example.com` | `password123` |
| `priya.patel@example.com` | `password123` |
| `leo.martin@example.com` | `password123` |

All seeded users share the same password. The app is at **http://localhost:5173** (frontend) with the API at **http://localhost:3001**.

## Key decisions

### Stack and architecture
- **Monorepo** with separate `backend/` and `frontend/` packages — simple to run locally, no shared build tooling needed.
- **Express + Prisma + PostgreSQL** for the API. Prisma gives type-safe queries and straightforward migrations.
- **React + Vite + Tailwind** for the UI — fast dev experience, minimal boilerplate.

### Authentication
- JWT stored in an **httpOnly cookie** rather than localStorage. This reduces XSS risk since JavaScript cannot read the token.
- CORS is configured with `credentials: true` so the browser sends cookies on cross-origin requests (dev: frontend on `:5173`, API on `:3001`).
- All equipment and cleaning-record routes require auth via middleware.
- **No role-based authorization** — any logged-in user can perform all actions. There is no permission checking by role.

### Pagination strategy
- **Equipment, cleaning records, and audit entries** all use **keyset (cursor) pagination** sorted by date + id.
- Composite indexes on `(createdAt, id)`, `(equipmentId, cleanedAt, id)`, and `(cleaningRecordId, createdAt, id)` support efficient cursor queries.

### Audit trail
- Every create/update on a cleaning record writes an `AuditEntry` with field-level `{ from, to }` changes (updates) or the full snapshot (creates).
- `cleanedByName` and `userName` are **denormalized** onto records/audit entries so history remains readable even if a user is later removed (`onDelete: SetNull` on the FK).

### Data integrity
- Equipment with cleaning history **cannot be deleted** — it must be retired instead. This preserves audit compliance.
- Cleaning records on **retired equipment** cannot be created or modified.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| Cookie auth | More secure than localStorage | Harder to use from non-browser clients; needs CORS/cookie config in production |
| Keyset pagination for records | Stable, scalable paging | Clients must pass opaque cursors; no "jump to page 5" |
| Denormalized names | Audit log stays readable | Names can become stale if a user renames themselves |
| No shared types package | Less setup | API types are duplicated loosely on the frontend |

## With more time

- **Async audit logging** — write audit entries in a background worker instead of blocking the API request.
- **E2E tests** (Playwright) covering login → create record → edit → view audit log.
- **Production deployment** — HTTPS, secure cookies, env-based API URL on the frontend (currently hardcoded to `localhost:3001`).
- **Optimistic UI updates** and better error/loading states on the frontend.

## Deliberately left out

- **Roles and permissions** — no role-based access control; authentication only (logged in vs not)
- User registration, password reset, and account management
- Soft-delete for cleaning records (records are immutable in spirit; only updates are audited)