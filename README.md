# Homebase

A private personal dashboard for goals, daily tasks, morning routines, assignments, reminders, streaks and saved YouTube videos.

## Architecture

- React + Vinext/Vite frontend, with authenticated server API routes.
- OpenAI Sites hosts the web app and enforces owner-only ChatGPT sign-in.
- Supabase Postgres stores planner data, including history, routine presets and the timetable.
- A Supabase Edge Function handles authenticated server-to-server storage requests. A random bridge credential stays in the Sites secret store; Postgres stores only its SHA-256 hash. Browser requests never receive it.
- Local development can use the original D1-compatible SQLite database. Hosted requests fail closed if Supabase configuration is missing.

Public source contains no personal goals, assignment records, database exports or credentials. Existing personal data is migrated separately. An empty installation starts with an empty planner.

## Development

Requires Node.js 22.13 or newer.

```sh
npm run install:ci
npm run dev
```

The local server runs on `http://localhost:5173`. The development sign-in cookie is only simulated on loopback. Local persistence lives in ignored `.wrangler/state/`.

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-planner.mjs
node scripts/check-routine-presets.mjs
node scripts/check-life.mjs
node scripts/check-notifications.mjs
node scripts/check-cloud.mjs
npm run build
```

## Hosting and configuration

Apply `supabase/migrations/202609210001_homebase.sql`, then deploy `supabase/functions/homebase-store/index.js`. The function uses custom bridge authentication; `verify_jwt = false` does not make data publicly accessible. Both database tables have RLS enabled and all access revoked from `anon` and `authenticated`. Access is through the authenticated server bridge only.

Set these **server runtime** values in Sites:

- `SUPABASE_URL`: the Supabase project API origin.
- `HOMEBASE_BRIDGE_SECRET`: a cryptographically random 32-byte hex string; insert its SHA-256 hash into `homebase_bridge_keys` separately.
- `HOMEBASE_OWNER_EMAIL`: the owner's verified Sites sign-in email.

Keep Sites access restricted to the owner. The application depends on Sites stripping and supplying its authenticated identity headers; do not expose the Worker directly on an untrusted host. GitHub stores source; it does not host the running application or contain the database.

Publishing uses the Sites build/package/deployment workflow. GitHub pushes run validation but do not automatically deploy a Site. Never upload `.env*`, `.dev.vars*`, `.sites-runtime/`, `.wrangler/`, imported spreadsheets or planner backups.

## Saving and reminders

Cloud changes are stored immediately and other open devices refresh about every 20 seconds when the user is not editing. Revision checks prevent a stale device silently overwriting a newer save. Unsaved notes are retained during refresh; failed drafts can be exported before reloading.

All schedules use Australia/Hobart time. The daily morning gate locks this dashboard until confirmed. Random pop-ups and optional ntfy alerts need Homebase open on an awake device; background execution on sleeping or closed devices is not guaranteed.

The original Excel data is a one-time import, not a live workbook link.
