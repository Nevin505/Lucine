# Leucine — Equipment Cleaning Records

A full-stack app for tracking equipment cleaning records in a manufacturing/pharma context. Operators log cleanings, update record status, and view an audit trail of changes.

**Stack:** Express + Prisma + PostgreSQL (API) · React + Vite + Tailwind (UI)

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose — **or** —
- [Node.js](https://nodejs.org/) v20 or later (for local development without Docker)

## Quick start (Docker — recommended)

From the repo root, build and start the database, API, and frontend:

```bash
docker compose up --build
```

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:5173    |
| API      | http://localhost:3001    |

The backend automatically runs migrations and seeds demo data on startup.

To run in the background:

```bash
docker compose up --build -d
```

To stop:

```bash
docker compose down
```

Database data is stored in a named Docker volume (`leucine_pgdata`) and **persists across restarts**. Stopping and starting containers with `docker compose down` / `docker compose up` keeps your data.

To reset the database (delete all persisted data):

```bash
docker compose down -v
docker compose up --build
```

## Local development (without Docker)

### 1. Start the database

```bash
docker compose up db -d
```

This starts PostgreSQL on `localhost:5432` with:

| Setting  | Value     |
|----------|-----------|
| User     | `leucine` |
| Password | `leucine` |
| Database | `leucine` |

### 2. Backend (API)

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API runs at **http://localhost:3001**.

**Environment variables** (see `.env.example`):

| Variable       | Description                    |
|----------------|--------------------------------|
| `DATABASE_URL` | PostgreSQL connection string   |
| `JWT_SECRET`   | Secret for signing auth tokens |
| `PORT`         | API port (default `3001`)      |
| `CORS_ORIGIN`  | Comma-separated allowed origins (optional) |

### 3. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The UI runs at **http://localhost:5173**.

### 4. Log in

After seeding, use any of these accounts (password for all: **`password123`**):

- `operator@example.com`
- `maria.santos@example.com`
- `james.chen@example.com`
- `priya.patel@example.com`
- `leo.martin@example.com`

## Running tests

From the `backend` directory:

```bash
npm test
```

## Project structure

```
Leucine/
├── backend/          # Express API, Prisma, PostgreSQL
│   ├── prisma/       # Schema, migrations, seed
│   └── src/
│       ├── modules/  # auth, equipment, cleaning-records
│       └── lib/      # pagination helpers
├── frontend/         # React SPA
└── docker-compose.yml
```

## API overview

All routes except `/auth/login` require authentication (JWT in an httpOnly cookie).

| Method   | Path                                                         | Description                                              |
|----------|--------------------------------------------------------------|----------------------------------------------------------|
| `POST`   | `/auth/login`                                                | Log in                                                   |
| `POST`   | `/auth/logout`                                               | Log out                                                  |
| `GET`    | `/auth/me`                                                   | Current user                                             |
| `GET`    | `/equipment`                                                 | List equipment (cursor pagination)                       |
| `POST`   | `/equipment`                                                 | Create equipment                                         |
| `GET`    | `/equipment/:id`                                             | Equipment detail                                         |
| `PATCH`  | `/equipment/:id`                                             | Update equipment                                         |
| `DELETE` | `/equipment/:id`                                             | Delete equipment (blocked if cleaning history exists)    |
| `GET`    | `/equipment/:id/cleaning-records`                            | List cleaning records (cursor pagination)                |
| `POST`   | `/equipment/:id/cleaning-records`                            | Create cleaning record                                   |
| `PATCH`  | `/equipment/:id/cleaning-records/:recordId`                  | Update cleaning record                                   |
| `GET`    | `/equipment/:id/cleaning-records/:recordId/audit-entries`    | Audit log for a record                                   |

## Useful scripts

**Backend**

| Script                   | Description              |
|--------------------------|--------------------------|
| `npm run dev`            | Start API with hot reload |
| `npm run prisma:migrate` | Apply migrations         |
| `npm run prisma:seed`    | Seed demo data           |
| `npm run prisma:studio`  | Open Prisma Studio       |
| `npm test`               | Run Vitest tests         |

**Frontend**

| Script           | Description       |
|------------------|-------------------|
| `npm run dev`    | Start dev server  |
| `npm run build`  | Production build  |
| `npm run lint`   | ESLint            |
