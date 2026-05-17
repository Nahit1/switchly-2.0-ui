# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`switchly-2.0-ui` is the Next.js dashboard for the Switchly feature-flag platform. It is a separate repo from the backend (`Switchly-2.0` at `~/Desktop/Switchly-2.0`) and consumes its REST API. The UI has no server-side data layer — every page is a `"use client"` component talking to the backend via `fetch`.

## Common commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # next build (output: standalone for Docker)
npm start            # serves the production build
npm run lint         # eslint (eslint-config-next)
```

Docker (mirrors the prod image): `docker compose up --build`. The image is `output: "standalone"` per `next.config.ts`.

There is no test setup. `npm run lint` and a successful `npm run build` are the only correctness gates.

## API connection

The backend base URL comes from `NEXT_PUBLIC_API_URL` (read in `lib/utils/api.ts`; the fallback is `http://localhost:8080`). `.env.local` is gitignored and must be created locally — point it at whichever backend you want. `docker-compose.yml` defaults to `http://localhost:8080`; override the env var when bringing the image up against a deployed backend (e.g. the prod Hetzner host).

Auth: JWT is stored in `localStorage["token"]` after login (also `userName`, `userEmail`). `lib/utils/api.ts` attaches `Authorization: Bearer ...` when `auth=true` (the default for `api.get/post/put`). No refresh token, no automatic 401 handling — a stale token currently produces silent failures, not a redirect.

## Architecture

### Routing (App Router)

- `app/page.tsx` is just `redirect("/login")` — there is no marketing/landing page.
- `app/(auth)/{login,register}` — public auth pages, share `app/(auth)/layout.tsx`.
- `app/dashboard/layout.tsx` — sidebar + auth guard. Reads `localStorage.token` and calls `userService.checkHasOrganization()`; if no org, hard-redirects to `/dashboard/organizations`. The "has org" result is cached in a ref to avoid re-checking on every navigation.
- `app/dashboard/{page,organizations,projects,projects/[orgId],flags,segments}` — feature pages. `/dashboard/settings` is in the sidebar marked "Yakında" but the route does not exist yet.

### Service / type layer

Per-resource files in `lib/services/<resource>.service.ts` and `lib/types/<resource>.ts`. Services are thin wrappers around `lib/utils/api.ts` (a small `fetch` helper exposing `api.get/post/put`). Path alias `@/*` resolves to repo root.

**Exception:** `lib/services/auth.service.ts` re-implements its own `post` rather than using `api`, because login/register run before there is a token. This is fine but it duplicates the base-URL logic — keep them in sync if either changes.

### State and data fetching

There is no client cache, no React Query, no SWR. Every page does `useEffect` + `useState` + manual `fetch`. A few consequences to know before editing:

- The dashboard overview (`app/dashboard/page.tsx`) does an N+1 fetch on every visit: orgs → projects per org → flags per project. There's no dedup if you navigate away and back.
- Mutations don't invalidate anything; pages re-fetch by re-running their `useEffect` after a state flip.
- Don't introduce `react-query`/`swr` for one-off fixes — that's a project-wide migration that should be done as a single refactor.

### Casing tolerance in API responses

You will see this pattern frequently:

```ts
flag.environments ?? (flag as { Environments?: ... })["Environments"]
projects[0].organizationName ?? projects[0]["OrganizationName"]
```

The backend uses System.Text.Json with the default camelCase policy, so the lower-case form is what actually arrives — but the code defensively reads PascalCase too. When adding new code, prefer the camelCase form and don't add new PascalCase fallbacks; when touching existing code, leave the fallbacks alone (low-priority cleanup, not worth churn).

### Theming and styling

- Tailwind v4 (`@tailwindcss/postcss`). No `tailwind.config.*` — config lives in `app/globals.css` via `@theme` / CSS custom properties.
- Theme is dark/light, controlled by `data-theme` attribute on `<html>` plus a `dark` class. The flash-prevention inline script in `app/layout.tsx` reads `localStorage.theme` before paint and sets the attribute synchronously — don't move this script or the page flashes.
- Components mix Tailwind utility classes with inline `style={{ color: "var(--text-primary)" }}` referencing CSS variables. Both are valid; match the surrounding file.
- Icons are inline SVG elements written by hand. There is no icon library yet.

### Dashboard pages are large by design (for now)

`flags/page.tsx` (~2.3k lines), `segments/page.tsx` (~1.7k), `projects/page.tsx` (~720), `organizations/page.tsx` (~620) each contain the page shell, all modals, all forms, all tables, and helper functions in one file. `components/` currently has only `ThemeToggle.tsx`. This is known and slated for decomposition; when a task asks you to *modify* one of these pages, edit in place — don't extract components opportunistically. Component extraction is its own task.

## Conventions

- Every page-level file starts with `"use client"`. This UI has no server components.
- `interface` for object shapes, `type` for unions/aliases (matches existing code).
- Form errors and success messages are in Turkish ("Bir hata oluştu.", "Kullanıcı"). When adding new copy, match the surrounding language.
- After login, `authService.login` is called and the caller (the login page) writes `token`, `userName`, `userEmail` into `localStorage` — services do not touch storage directly. Keep this boundary.
