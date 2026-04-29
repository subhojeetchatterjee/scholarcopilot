# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # run ESLint (eslint.config.mjs, Next.js config)
```

No test runner is configured. The match engine has inline test profiles in `lib/matchEngine.ts` (exported as `TEST_PROFILES`) with expected outputs documented in comments. To exercise them you need `tsx` or `ts-node`:

```bash
npx tsx -e "import { matchScholarships } from './lib/matchEngine'; import { TEST_PROFILES } from './lib/matchEngine'; import rawSc from './data/scholarships.json'; console.log(matchScholarships(TEST_PROFILES.priya, rawSc as any).slice(0,3))"
```

## Architecture

This is a **Next.js 16 App Router** project (note: AGENTS.md warns this version has breaking changes — check `node_modules/next/dist/docs/` before modifying Next.js-specific behavior).

### Data flow

1. **`/profile`** — user fills `ProfileForm` (client component); on submit the validated profile is stored in `sessionStorage` under key `sc_profile` and the user is redirected to `/matches`.
2. **`/matches`** — reads `sc_profile` from `sessionStorage`, calls `POST /api/match`, stores the full response in `sessionStorage` under `sc_match_response`, and renders grouped `ScholarshipCard` components.
3. **`/scholarship/[id]`** — reads both `sessionStorage` keys, renders the detail view with `AIAnswerPanel` components that call `/api/explain`, `/api/followup`, and `/api/draft-answer`.

No server-side session or database. All state lives in the browser's `sessionStorage`. Profile data never reaches a server at rest.

### Key files

| File | Role |
|------|------|
| `types/index.ts` | Single source of truth for all TypeScript interfaces (`StudentProfile`, `Scholarship`, `MatchResult`, etc.) |
| `lib/matchEngine.ts` | Pure, deterministic rule engine — no AI. Returns `MatchResult[]` sorted by score. Hard fails short-circuit immediately; missing fields increment `missingCount` and cap the score. |
| `lib/validators.ts` | Zod schemas. `StudentProfileSchema` handles CGPA→percentage normalisation via `conversion_method`. All API routes use `safeParse` + `formatZodError`. |
| `lib/claudeClient.ts` | Thin wrapper around `@anthropic-ai/sdk`. Single `callClaude()` function; system prompt is always sent with `cache_control: { type: "ephemeral" }` for prompt caching. |
| `data/scholarships.json` | Static dataset (~35 entries). Loaded at module level in `/api/match/route.ts` and converted once to a `Map` keyed by `id`. To add a scholarship, extend this file following the `Scholarship` interface. |
| `app/api/*/route.ts` | All route handlers follow the same pattern: parse JSON → `safeParse` with Zod → call logic → return `NextResponse.json`. |

### Match engine scoring

Status and score are computed independently:

**Dimension bonuses** (accumulated regardless of hard blockers): state-specific match +15, category-specific match +10, marks ≥ min+10 → +10, disability preferred +5, deadline >30 days +5.

**Status rules:**
- Hard blocker fires (wrong state/course/category/gender/marks/income/disability) → `not_eligible`
- Structural missing (service-certificate doc, no profile field to verify) → `insufficient_data`
- `missingCount` 1–2 → `maybe_eligible`; 3+ → `insufficient_data`

**Score caps by status:**

| Status | Score |
|--------|-------|
| `eligible` | base 60 + bonuses, capped 100 |
| `maybe_eligible` | base 60 + bonuses, capped 70 |
| `insufficient_data` | base 60 + bonuses, capped 30 |
| `not_eligible` | bonuses only (base 60 excluded), capped 39 |

For `not_eligible`, score = `min(max(0, accumulatedScore − 60), 39)`. Zero only when no bonuses fired. `match_reasons` is populated (not empty) so the detail page can show what did align alongside the blocking reason.

- Scholarships requiring a "service certificate" doc always return `insufficient_data` because `StudentProfile` has no field for parent/guardian service status.
- Income uses a three-way band comparison — overlapping bands produce `maybe_eligible`, not a hard fail.

### AI routes

All AI routes call `callClaude()` with a static system prompt (eligible for prompt caching) and a dynamically built user message. Each route is independent — `/api/explain` explains a match result; `/api/followup` asks clarifying questions for missing data; `/api/draft-answer` drafts an application answer; `/api/translate` translates text to `en`/`hi`/`bn`.

**`/api/explain` prompt behavior by status:**
- `eligible` — leads with matched dimensions, closes with a recommended next step.
- `maybe_eligible` — explains uncertainty, surfaces what needs verification.
- `insufficient_data` — explains which fields are missing and why they matter.
- `not_eligible` with `match_reasons` non-empty — two-part structure: (1) acknowledge aligned dimensions, (2) state blocking criteria with a transition phrase ("However, one required criterion is not met:"). Never implies eligibility; never ignores the matched aspects.
- `not_eligible` with empty `match_reasons` — treats it as a near-total mismatch, focuses on blockers only.

### Rate limiting

All four AI routes are protected by `lib/rateLimit.ts` using **Upstash Redis + `@upstash/ratelimit`** (sliding window algorithm). Two layers are checked in order on every request:

1. **Burst guard** (shared): 3 requests / minute / IP — prefix `rl:burst`
2. **Hourly quota** (per route):

| Route | Limit |
|-------|-------|
| `/api/explain` | 8 / hour |
| `/api/followup` | 4 / hour |
| `/api/draft-answer` | 4 / hour |
| `/api/translate` | 12 / hour |

Exceeded limits return HTTP 429 `{ "error": "Rate limit exceeded. Please try again later." }` with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

IP is extracted from `x-forwarded-for` (Vercel sets this), falling back to `x-real-ip`, then `"unknown"`.

**Required Vercel environment variables** (set in Project Settings → Environment Variables):

```
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>
```

These are read by `Redis.fromEnv()` in `lib/rateLimit.ts`. Get both values from the Upstash console after creating a Redis database (or via the Upstash integration in the Vercel marketplace).

### Multilingual support

`preferred_language` on `StudentProfile` (`"en" | "hi" | "bn"`) is passed through to all AI routes. Each route has a `LANGUAGE_INSTRUCTION` map that prepends the appropriate directive to the user message.

### Theme

Dark mode is implemented via Tailwind `dark:` classes. A blocking inline script in `app/layout.tsx` reads `localStorage['sc-theme']` before first paint to prevent flash. `ThemeToggle` component persists the choice.

### Client-side AI output caching

`lib/aiCache.ts` provides `getCached`, `setCached`, and `profileFingerprint` used exclusively by `MatchSection.tsx` to avoid repeat LLM calls when a user revisits the same scholarship in the same tab session.

**Cache keys** (all stored in `sessionStorage`, TTL 60 min, format `{ value, expiresAt }`):

| Key pattern | Contents |
|-------------|----------|
| `sc_ai:explain:{scId}:{fp}` | Explanation text |
| `sc_ai:draft:{scId}:{fp}` | Draft answer text |
| `sc_ai:followup:{scId}:{fp}` | JSON-serialised `string[]` of followup questions |
| `sc_ai:translate:explain:{scId}:{fp}:{lang}` | Translated explanation |
| `sc_ai:translate:draft:{scId}:{fp}:{lang}` | Translated draft |

`fp` = profile fingerprint — a pipe-joined string of all fields that appear in AI payloads (`full_name`, `age`, `state`, `class_or_degree`, `institution_type`, `annual_family_income_range`, `category`, `gender`, `disability_status`, `normalized_percentage`, `preferred_language`, `career_goal`). Changing any profile field invalidates all cached outputs.

On mount, `MatchSection` restores any unexpired cached outputs directly to their success state. On button click, cache is checked before any `fetch()` call; only successful API responses are stored.

### `@/` path alias

`@/` maps to the project root (configured in `tsconfig.json`). Use it for all internal imports.
