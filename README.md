# Alper Chores

A responsive, installable **weekly family chore & meal organizer** (PWA). Family
members open the week on a computer or phone and assign themselves to chores from
a dropdown, plan meals, and check things off. Built for the Alper family but
designed to grow (more members, more chores, Hebrew/RTL later).

- 🗓️ Monday–Sunday weekly schedule with Previous / This / Next week navigation
- 👨‍👩‍👧‍👦 Family members stored in the database and managed in-app
- 🔁 One-time **and** recurring chores, with occurrence / week / series scopes
- 🍽️ Meal planning (home-cooked, restaurant, takeout, leftovers, other) with recipe links
- ✅ Completion tracking (pending / completed / skipped)
- 📱 Installable PWA with offline app-shell and a friendly install hint
- 🌍 Timezone-correct (Asia/Jerusalem) with UTC storage

---

## Table of contents

- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Screenshots](#screenshots)
- [Local prerequisites](#local-prerequisites)
- [Local installation](#local-installation)
- [PostgreSQL setup](#postgresql-setup)
- [Environment variables](#environment-variables)
- [Prisma migrations & seed](#prisma-migrations--seed)
- [Development commands](#development-commands)
- [Testing](#testing)
- [Production build](#production-build)
- [Railway deployment](#railway-deployment)
- [PWA installation](#pwa-installation)
- [Recurrence model](#recurrence-model)
- [Occurrence key](#occurrence-key)
- [Database backup](#database-backup)
- [Troubleshooting](#troubleshooting)
- [Future improvements](#future-improvements)

---

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | React 18, TypeScript, Vite 5, React Router, TanStack Query, `vite-plugin-pwa` |
| Styling   | Hand-written responsive CSS (light/dark, RTL-ready), no heavy UI framework |
| Backend   | Node.js, Express 4, TypeScript (run with `tsx`), Zod validation, Helmet, rate limiting |
| Database  | **PostgreSQL only**, Prisma ORM with migrations |
| Deploy    | Railway (one app service + one PostgreSQL service), Dockerfile |
| Tests     | Vitest + React Testing Library (unit/component), Playwright (E2E) |

The **same production server** serves the compiled React app and the REST API
under `/api`, binds to `0.0.0.0`, and uses `PORT` / `DATABASE_URL` from the
environment.

## Repository structure

```
Alper-Chores/
├── client/                 # React + Vite PWA
│   ├── public/icons/       # Generated app icons (192/512/maskable/apple-touch)
│   ├── src/
│   │   ├── api/            # fetch client + React Query hooks
│   │   ├── components/     # Dialog, Toast, MemberSelect, StatusControl, ...
│   │   ├── features/schedule/  # Week grid, mobile day view, meal & chore forms
│   │   ├── hooks/          # media query, PWA install/offline
│   │   ├── i18n/           # centralized strings (Hebrew-ready)
│   │   ├── pages/          # Schedule, Family, Chores, Settings
│   │   ├── styles/         # global.css
│   │   └── utils/
│   └── vite.config.ts
├── server/                 # Express API
│   ├── src/
│   │   ├── config/         # env validation + Prisma client
│   │   ├── middleware/     # error handler, validation
│   │   ├── routes/         # /api routers
│   │   ├── services/       # schedule assembly, occurrence mutations, members...
│   │   ├── validation/     # Zod schemas
│   │   └── app.ts, index.ts
│   └── tests/              # DB-gated API integration tests
├── shared/                 # Types + date utils + recurrence engine (used by both)
├── prisma/                 # schema.prisma, migrations/, seed.ts
├── e2e/                    # Playwright specs
├── tests/                  # Vitest unit/component tests
├── scripts/                # icon generator, local stub server
├── Dockerfile, railway.json, .env.example
```

## Screenshots

> _Add screenshots here after deployment._

- **Desktop** — 7-column Monday–Sunday grid with category sections.
- **Mobile** — one day at a time with a horizontal day selector and weekly progress bars.

## Local prerequisites

- **Node.js ≥ 18.16** (the app is validated on 18.16; the Docker image uses Node 20)
- **PostgreSQL 14+** running locally (or a Railway/remote database URL)
- npm 9+

## Local installation

```bash
git clone https://github.com/benjyalper/Alper-Chores.git
cd Alper-Chores
npm install
cp .env.example .env        # then edit DATABASE_URL
```

## PostgreSQL setup

Create a local database and point `DATABASE_URL` at it:

```bash
createdb alper_chores
# .env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alper_chores?schema=public
```

## Environment variables

See [.env.example](.env.example). Required at startup (validated by the server):

| Variable             | Purpose                                              |
|----------------------|------------------------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string (**required**)          |
| `NODE_ENV`           | `development` / `production` / `test`                |
| `PORT`               | Local port (Railway injects this automatically)      |
| `HOUSEHOLD_TIMEZONE` | Defaults to `Asia/Jerusalem`                         |
| `SESSION_SECRET`     | Reserved for future PIN/session support              |
| `CORS_ORIGINS`       | Comma-separated origins for cross-port local dev     |

Never commit a real `.env`, password, Railway token, or database URL.

## Prisma migrations & seed

```bash
npm run prisma:generate     # generate the Prisma client
npm run prisma:migrate      # create/apply a dev migration (local)
npm run prisma:deploy       # apply committed migrations (production)
npm run prisma:seed         # idempotent seed (safe to run repeatedly)
```

The seed creates the **Alper Family** household, four editable placeholder
members, the categories (Meals, Kitchen, Laundry, Pets, Other), and all required
chores (three meals/day, load & unload dishwasher, fold & put away laundry, feed
the cat at 12:00, and the four morning/evening dog chores).

## Development commands

```bash
npm run dev            # server (3000) + client (5173) with API proxy
npm run dev:server     # Express only (tsx watch)
npm run dev:client     # Vite only
npm run lint           # ESLint (0 warnings allowed)
npm run typecheck      # tsc for server + client
```

Open http://localhost:5173 during development.

## Testing

```bash
npm test               # Vitest: recurrence, dates, validation, components (no DB needed)
npm run test:e2e       # Playwright critical flows (needs a TEST database)
```

- **Unit/component tests run without a database** — the recurrence engine and date
  utilities are pure functions, exhaustively tested (week math, Israel timezone,
  daily/weekly recurrence, start/end dates, one-off override, this-and-future
  assignment, cancelled occurrence, DST boundaries).
- **API integration** (`server/tests`) and **E2E** run only when
  `TEST_DATABASE_URL` is set, and must **never** point at the production database.

```bash
# Example E2E run against a throwaway test DB:
export TEST_DATABASE_URL=postgresql://.../alper_chores_test
DATABASE_URL=$TEST_DATABASE_URL npm run prisma:deploy
DATABASE_URL=$TEST_DATABASE_URL npm run prisma:seed
npm run test:e2e
```

## Production build

```bash
npm run build          # prisma generate + Vite build (client/dist + service worker)
npm start              # NODE_ENV=production server on 0.0.0.0:$PORT
```

The server serves `client/dist` with an SPA fallback and exposes `/api`.

## Railway deployment

1. **Push** this repository to GitHub (`https://github.com/benjyalper/Alper-Chores`).
2. In Railway, **New Project → Deploy from GitHub repo** and pick `Alper-Chores`.
3. **Add a PostgreSQL service**: _New → Database → PostgreSQL_. Railway exposes a
   `DATABASE_URL` variable on that service.
4. On the **app service → Variables**, reference the database:
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}` and add
   `HOUSEHOLD_TIMEZONE=Asia/Jerusalem`, `SESSION_SECRET=<long random>`,
   `NODE_ENV=production`.
5. Railway builds using the **Dockerfile**. On deploy, the start command runs
   `prisma migrate deploy` (applies committed migrations) then `prisma db seed`
   (idempotent) then starts the server — see [railway.json](railway.json). After
   the first successful deploy you may remove `&& npx prisma db seed` from the
   start command if you prefer not to re-run it.
6. **Generate a domain**: app service → Settings → Networking → _Generate Domain_.
7. Verify `https://<your-app>.up.railway.app/api/health` returns `{"status":"ok"}`.
8. Open the app and verify the schedule loads and PWA install is offered.

> Production uses `prisma migrate deploy` (never `migrate dev`), so no destructive
> development migration runs against the production database.

## PWA installation

**Android (Chrome):** open the site → browser menu (⋮) → **Install app** /
**Add to Home screen**. An in-app install hint also appears (dismissible).

**iPhone/iPad (Safari):** iOS does not fire the install prompt. Open the site in
Safari → tap the **Share** button → **Add to Home Screen** → **Add**. The app
opens standalone with the Alper Chores icon.

Icons: 192×192, 512×512, maskable variants, an Apple touch icon, and an SVG
favicon are generated by `node scripts/generate-icons.mjs`.

## Recurrence model

We never pre-create years of chore rows. A week is **generated on demand** from
rules and merged with dated rows:

- **ChoreTemplate** — defines a chore (name, category, default time, meal-ness).
- **RecurrenceRule** — defines *when* it happens: `ONCE`, `DAILY`, `WEEKLY`,
  `CUSTOM_WEEKLY`, with `interval`, `daysOfWeek` (ISO 1–7), `startDate`, optional
  `endDate`, and `time`.
- **AssignmentRule** — default responsible member over a date range
  (`effectiveFrom` → `effectiveUntil`), used for "this and future" assignments.
- **ChoreOccurrenceOverride** — a single date that differs (assignee, name, time,
  notes, or cancellation).
- **ChoreCompletion** — completion status for a single dated occurrence.
- **MealPlan** — meal details for a single dated meal occurrence.

**Resolution algorithm (per week):**

1. Load active templates + their active recurrence rule (+ assignment rules), plus
   all overrides/completions/meals whose `occurrenceDate` falls in the week — in a
   fixed number of batched queries (no N+1).
2. For each template and each of the 7 local dates, ask `ruleFiresOn(rule, date)`
   (pure calendar logic on local ISO dates).
3. An occurrence exists if the rule fires **or** a non-cancelled override adds one;
   a cancelled override removes it.
4. The assignee is: the override's member (if set) → else the meal's member (for
   meals) → else the assignment rule covering that date → else Unassigned.
5. Merge completion status and meal summary. Sort by time then name.

This lives in [`shared/recurrence.ts`](shared/recurrence.ts) and
[`shared/dates.ts`](shared/dates.ts) and is unit-tested in `tests/`.

**Assignment scopes:** `occurrence`, `rest-of-week`, `this-and-future`,
`entire-series`. **Edit scopes:** `occurrence`, `this-and-future`,
`entire-series`. Series changes run in a transaction so they never leave partial
state.

### Timezone handling

All schedule logic is expressed as **local ISO date strings** (`YYYY-MM-DD`) in
the household timezone, so a chore on "Monday in Israel" stays Monday regardless
of server timezone. `@db.Date` columns are stored at UTC midnight and timestamps
are stored in UTC. Week math is pure calendar arithmetic, so DST and midnight
boundaries don't cause off-by-one bugs.

## Occurrence key

Every generated occurrence has a deterministic, stable key:

```
occurrenceKey = `${choreTemplateId}__${localDate}`   e.g. "clx123__2026-07-13"
```

The compound key `(choreTemplateId, occurrenceDate)` is unique across overrides,
completions, and meal plans (enforced by DB unique constraints), so a recurring
occurrence can never accidentally receive duplicate rows. All occurrence-level API
routes accept this key.

## Database backup

Take regular logical backups:

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom -f alper_chores_$(date +%F).dump
# restore:
pg_restore --clean --no-owner -d "$DATABASE_URL" alper_chores_YYYY-MM-DD.dump
```

On Railway, you can also enable managed backups on the PostgreSQL plugin, or run
the `pg_dump` above against the public connection string on a schedule.

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Missing `DATABASE_URL`** | The server exits with a clear message. Set `DATABASE_URL` in `.env` / Railway variables. |
| **Prisma client not generated** (`@prisma/client did not initialize`) | Run `npm run prisma:generate` (also runs on `postinstall` and in the Docker build). |
| **Migration failure** on deploy | Check the Railway deploy logs. Ensure `prisma/migrations` is committed and `DATABASE_URL` is reachable. Never run `migrate dev` in production. |
| **Railway build failure** | Confirm `package-lock.json` is committed (the Dockerfile uses `npm ci`). Check the build logs for the failing step. |
| **Blank page after deploy** | Usually the client build didn't run. Verify `client/dist/index.html` exists in the image and the app service serves it (`/` should return HTML). |
| **SPA route returns 404** | The server has an SPA fallback for non-`/api` GETs; ensure you're hitting the app service (not the database) and that `client/dist` shipped. |
| **PWA install option not appearing** | Install requires HTTPS (Railway provides it), a valid manifest, and a registered service worker. On iOS use Safari's Share → Add to Home Screen. Some browsers only offer install after a short visit. |
| **Service worker shows an old version** | The SW uses auto-update; hard-refresh, or in DevTools → Application → Service Workers → Unregister, then reload. HTML and `sw.js` are served `no-cache`. |

## Future improvements

Designed for but intentionally **not** built in v1:

- Individual user accounts and a simple household access **PIN** (a `SESSION_SECRET`
  placeholder already exists). PIN idea: a single hashed PIN in env/DB, exchanged
  for a signed session cookie, gating `/api` writes.
- Push notifications, meal & chore reminders
- Points / rewards, fairness reports, automatic chore rotation
- Shopping lists, recipe-site integration
- Multiple households (the schema already carries `householdId`)
- **Hebrew interface & full RTL** (strings are centralized in `client/src/i18n`)
- Real-time synchronization (v1 uses focus refetch + light polling)

---

### License / attribution

Original app icons are generated programmatically (`scripts/generate-icons.mjs`)
and are not copied from any third-party artwork.
