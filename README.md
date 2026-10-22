# Gatherly AI

**GenAI-powered planning assistant for weddings, birthdays, and community events.**

Gatherly AI brings budgeting, timelines, vendor checklists, and personalized ideas into one calm,
local-first workspace. Track a budget category by category, keep the timeline honest, compare vendor
quotes, and browse thoughtful ideas. Live Gemini suggestions are optional and clearly labelled;
curated ideas always work without an API key.

Built as a hackathon-ready demo: it needs no account or application database, and the plan lives in
the browser. Gemini is an optional enhancement rather than a requirement. This is not hardened for
unrestricted public production use; see **Known limitations**.

## Features

- **Budget planning:** category-level amounts, planned and remaining totals, and budget-health
  warnings that update as the plan changes.
- **Event timelines:** dated tasks, priorities, completion progress, overdue flags, and next-up
  guidance.
- **Vendor checklists:** quotes, contacts, status stages, and follow-up dates for each event.
- **Personalized ideas:** curated suggestions by event type, plus optional Gemini-generated ideas
  that fit the saved event context. Save, set aside, or convert an idea into a timeline task.
- **Local-first demo:** a complete wedding demo, multiple events, confirmation dialogs, and
  browser persistence with no account or database.

## Getting started

```bash
npm install
npm run dev
```

For a reproducible install from the lockfile, use `npm ci` instead of `npm install`.

Open <http://localhost:3000>. The demo wedding loads from the **Load demo event** button on
**My Events**. No database is required; state lives in the browser.

## Demo workflow

1. Open **My Events** and choose **Load demo event**.
2. Visit **Budget**, change a category amount, and watch the planned total, remaining amount, and
   health indicator update.
3. Visit **Timeline** and mark a task complete; progress and the next milestone update immediately.
4. Visit **Vendors** and move a vendor to the next stage.
5. Open **AI Ideas**, generate one action (with a key configured), then save a card, set another
   aside, and turn a saved idea into a timeline task.
6. Reload the page to show that the event, ideas, saved cards, and tasks persist in the browser.

To enable live AI, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`:

```bash
cp .env.example .env.local
```

`GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`, the model used for the recorded live
acceptance test. The key is read only by the `/api/ideas` route handler and never reaches the browser
bundle. Restart the dev server after changing environment variables.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, Next core-web-vitals + TypeScript) |
| `npm run typecheck` | TypeScript strict check, no emit |
| `npm test` | Vitest unit tests (domain rules, AI contracts, mocked Gemini route) |

### Build and preview

```bash
npm run build
npm start
```

The production server also runs at <http://localhost:3000>. No environment variables are required
unless you want live Gemini suggestions.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview: countdown, budget health, task progress, next up, sample idea |
| `/events` | Create events, switch the active event, load or reset the demo wedding |
| `/budget` | Edit category amounts, add or remove categories, over-budget warnings |
| `/timeline` | Add tasks, set due dates and priority, mark done, overdue flags |
| `/vendors` | Track quotes, contacts, status, and follow-up dates |
| `/ideas` | Curated ideas plus Gemini suggestions; save, set aside, or turn one into a task |
| `POST /api/ideas` | Server-only Gemini generation for one planning action |

## Data and persistence

All state lives in the browser at `localStorage["gatherly.state.v1"]`:

- `version` — schema version, currently `1`
- `events` — event records, one active event at a time
- `budgetItems` — categories, each linked to an event by `eventId`
- `tasks` — timeline items, each linked to an event
- `vendors` — vendor records, each linked to an event
- `savedIdeas` / `dismissedIdeas` — idea keys the user kept or set aside, per event
- `generatedIdeas` — Gemini ideas kept for the active event, so saved cards survive a refresh

State is validated with Zod on load (`src/lib/storage.ts`). Invalid or corrupted data is discarded
rather than crashing the app. If the browser blocks storage, the shell shows a warning and changes
last only for the session.

The demo event uses the stable id `event-demo`. **Reset demo** replaces only the demo event and its
data; other events are preserved. Deleting an event cascades to its budget, tasks, vendors, and
saved or generated ideas. All destructive actions ask for confirmation.

## Structure

```
src/
  app/                 App Router pages and the POST /api/ideas route
  components/          App shell, UI primitives, event form
  lib/
    schema.ts          Zod contracts and domain types
    labels.ts          Enum values, labels, option lists
    format.ts          INR and date-only helpers (UTC-safe)
    budget.ts          Budget summary and health rules
    timeline.ts        Task ordering, progress, overdue rules
    seed.ts            Demo data and starter budget categories
    storage.ts         localStorage load/save with schema validation
    security-headers.ts Production security headers and CSP
    store.tsx          Client store: external store, actions, provider
    ideas.ts           Sample ideas by event type, idea keys and budget fit
    ai/
      schema.ts        Request/output Zod contracts, model defaults
      prompt.ts        Versioned system prompt and event payload
      generate.ts      Gemini call, timeout, output validation, safe errors
```

## Stack and architecture

- **Framework:** Next.js 16 App Router, React 19, TypeScript 5.9 (strict)
- **Styling:** Tailwind CSS 4 with project tokens in `src/app/globals.css`
- **Validation:** Zod 4 contracts for forms, stored state, and Gemini input/output
- **AI:** `@google/genai` called only from the server-side route handler
- **Tests:** Vitest domain tests and a mocked route test suite
- **Persistence:** browser `localStorage`; there is no application database

The client store (`src/lib/store.tsx`) owns event-scoped state, and the domain modules in
`src/lib/` hold the budget, timeline, idea, and validation rules. The only server boundary is
`POST /api/ideas`, which validates the request, calls Gemini, validates the model response, and
returns clean JSON without exposing the API key.

Design tokens live in `src/app/globals.css` (Tailwind v4 `@theme`). No external font requests are
made; the display face is a system serif stack, so rendering does not depend on a font CDN.

## AI ideas (Gemini)

`POST /api/ideas` accepts one event context and one action, then asks Gemini for four ideas. The
seven actions are theme, décor, menu, guest experience, savings, budget improvement, and next
planning steps. `budget-improvement` suggestions appear under Savings; `next-steps` under Guest
experience.

- **Server-only:** `@google/genai` is imported only by `src/lib/ai/generate.ts`, which is called by
  the route handler. `GEMINI_API_KEY` is never returned to the client.
- **Contracts:** the request, model output, and stored response are separate Zod schemas. Unknown
  request fields are rejected; malformed model output is rejected rather than saved.
- **Guardrails:** 16 KB body cap, 12 requests per 10 minutes per IP, 40-second SDK timeout, 2,048
  output tokens, no retries, and provider messages are replaced with safe copy.
- **Provenance:** AI cards say **Gemini** and curated cards say **Curated**. Curated ideas remain
  available if the key is missing, the model fails, or the request is rate-limited.
- **Retries:** regenerating an action replaces its unsaved Gemini ideas. Cards you saved or set
  aside stay available; keys are scoped per event and per idea.

The default model is `gemini-3.8-flash` (structured outputs supported), matching the recorded live
acceptance test. Check current [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) before
relying on cost estimates; a typical request returns four ideas.

**Abuse protection:** the in-memory limiter is per server instance and trusts `x-forwarded-for`. It is
not a public abuse control. Before exposing this publicly, add an edge limit in the hosting dashboard
and set provider spend alerts.

### Public-deployment hardening

The route already rejects malformed input, caps the body at 16 KB, validates model output, uses a
40-second timeout and a 2,048-token cap, and returns safe errors. Keep those controls; do not replace
the in-memory limiter with a fake shared limiter.

Add this Vercel Firewall rule in the dashboard (not stored in git):

1. Vercel → project → **Firewall** → **Configure** → **New Rule**.
2. Name it `Limit POST /api/ideas`.
3. Add two **If** conditions (all must match):
   - **Path** equals `/api/ideas`
   - **Method** equals `POST`
4. **Then** → **Rate Limit** → **Fixed Window** (availability depends on your plan).
5. Set **Time Window** to `600` seconds, **Request Limit** to `12`, key to **IP**, and keep the
   default **429** action.
6. **Review Changes** → **Publish**.
7. Monitor **Firewall** traffic for the rule. Do not test the limit by sending abusive traffic.

Equivalent CLI after linking the project and authenticating:

```bash
vercel firewall rules add "Limit POST /api/ideas" \
  --condition '{"type":"path","op":"eq","value":"/api/ideas"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 600 \
  --rate-limit-requests 12 \
  --rate-limit-keys ip \
  --rate-limit-action rate_limit \
  --yes
```

The edge rule runs before the function and reduces abuse, but it is not a provider spend cap. In
Google Cloud Billing, set a budget with alerts for the project that owns `GEMINI_API_KEY`, and
monitor usage in Google AI Studio. Rotate the key if it is exposed.

**Privacy:** the event name, type, date, location, guest count, budget, theme, priorities, budget
categories, and any constraints you type are sent to Google when you generate ideas. Do not enter
sensitive personal data.

## Deployment

The app is a standard Next.js project and can be deployed to Vercel or any Node.js host that can run
`npm run build` and `npm start`. No database is required.

### Deploying to Vercel

1. Import the repository at <https://vercel.com/new> and keep the detected Next.js defaults.
2. Add `GEMINI_API_KEY` and, optionally, `GEMINI_MODEL` under Project → Settings → Environment
   Variables for the environments you use.
3. Deploy, then run the demo workflow against the deployment URL.

Keep both values server-only; do not use a `NEXT_PUBLIC_` prefix. If your serverless plan caps
function duration below 40 seconds, raise it or lower `REQUEST_TIMEOUT_MS` in
`src/lib/ai/generate.ts`.

### Security headers

Production responses set `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, and a Content Security Policy from
`src/lib/security-headers.ts`. HSTS is left to the hosting platform so it is not duplicated.

The CSP allows inline scripts and styles because Next.js prerenders inline bootstrap scripts and the
UI uses React `style` attributes for progress widths. A nonce policy would require dynamic rendering
through a Next.js Proxy. No application route adds CORS headers; `/api/ideas` stays same-origin.

## Known limitations

- **Local-only data:** state is stored in one browser. There are no accounts, sync, sharing, or
  server backups; clearing site data removes the plan.
- **No authentication:** `/api/ideas` is intentionally open for this demo. Do not expose it as a
  public production service without auth and a shared or edge rate limit. The Vercel Firewall rule
  above must be created in the dashboard; it is not active from this repository.
- **Best-effort rate limiting:** the in-memory limiter is per server instance and trusts
  `x-forwarded-for`; run behind a proxy that overwrites that header and add a platform/WAF limit
  before public use.
- **CSP uses `'unsafe-inline'` for scripts and styles:** required by Next.js inline bootstrap output
  and existing inline style attributes. Tighten it with a nonce if the pages move to dynamic
  rendering.
- **Live AI is optional and variable:** requests can take around 20 seconds or fail. Curated ideas
  remain available. Event details and any constraints are sent to Google when live AI is used.
- **Not every integration is built:** payments, calendar sync, email, and vendor messaging are
  manual or out of scope.
- **Automated browser coverage is not configured:** the unit/route suite is automated, while the
  end-to-end checks are currently a documented manual browser pass.

## Testing

Unit tests are colocated with the domain modules and cover the rules most likely to regress:

- budget totals, remaining amounts, and health thresholds
- task ordering, progress rounding, and overdue boundaries
- event and vendor validation, including past-date rejection
- demo totals (exactly ₹4,50,000) and seed id uniqueness
- AI request/output contracts, prompt contents, action-to-section mapping, and stored idea keys
- production security headers, including the CSP and the absence of CORS/HSTS overrides
- `/api/ideas` behaviour with a mocked Gemini SDK: valid generation, event context propagation,
  invalid payloads, missing key, malformed output, timeout, rate limit, and error sanitization

No test makes a paid API call. To test live generation, run the app with a key and use **Plan with
Gemini** on `/ideas`. Browser E2E is checked manually; Playwright is not configured in this repo.
