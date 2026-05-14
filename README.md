# React Calendar Statement

Same calendar app, five client-state approaches, one server-state layer.

## Apps

- `api-server`: local API server with token auth, user-scoped events, and editable categories
- `apps/react-state-calendar`: React local state + TanStack Query
- `apps/zustand-calendar`: Zustand + TanStack Query
- `apps/jotai-calendar`: Jotai + TanStack Query
- `apps/recoil-calendar`: Recoil + TanStack Query
- `apps/redux-toolkit-calendar`: Redux Toolkit + TanStack Query

## Shared Packages

- `packages/calendar-ui`: presentational calendar components
- `packages/calendar-api`: HTTP API client, auth token storage, and TanStack Query hooks
- `packages/calendar-types`: shared domain types
- `packages/calendar-utils`: date and filtering helpers

## Commands

```bash
pnpm install
pnpm dev
pnpm --filter api-server dev
pnpm --filter react-state-calendar dev
pnpm --filter zustand-calendar dev
pnpm --filter jotai-calendar dev
pnpm --filter recoil-calendar dev
pnpm --filter redux-toolkit-calendar dev
```

The API server runs on `http://localhost:4000`. It stores data in a local SQLite file at
`api-server/data/calendar.db`. The frontend stores the auth token in `localStorage`
under `react-calendar-statement-token`.

Auth is intentionally simple for comparison work: logging in with a new email creates a local user,
returns a bearer token, and stores events/categories by `userId` in SQLite.
