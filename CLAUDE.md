# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # run ESLint (eslint.config.mjs, Next.js config)
npx tsc --noEmit # type-check without emitting files
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
| `data/scholarships.json` | Production dataset. 31 records total: 2 `verified` (sc-038, sc-043), 29 `mock`. Removed records: 6 institution-specific mocks (sc-015, sc-025, sc-028, sc-029, sc-033, sc-034) + sc-003 (superseded by verified sc-038). Real verified entries are added via the ingestion pipeline below. |
| `data/scholarships-staging.json` | Staging area. 9 records awaiting human review — all blocked because their deadlines are 2025-cycle (past as of April 2026). Each record's `verification_note` opens with `[DEADLINE STALE — April 2026]`. Do not promote until the current-cycle deadline is confirmed on the source portal. |
| `app/api/*/route.ts` | All route handlers follow the same pattern: parse JSON → `safeParse` with Zod → call logic → return `NextResponse.json`. |
| `components/VerificationBadge.tsx` | Shared pill component rendering verification status in three variants: `verified` (emerald + checkmark), `needs_review` (slate + clock), `mock` (amber + info icon). Used in `ScholarshipCard` and the detail page. |
| `scripts/add-scholarship.ts` | Ingestion CLI — validates a draft JSON, assigns the next `sc-NNN` ID, timestamps it, and appends to `data/scholarships-staging.json`. Use `--template` to print a blank draft, `--list-staging` to list staged records, `--promote sc-NNN` to move a record to production. |
| `scripts/audit-scholarships.ts` | Developer audit report — run with `npx tsx scripts/audit-scholarships.ts`. Outputs production counts by status, under-review records by source type with ambiguous field flags, staged replacement map (including production-level superseding), staging deadline status, and 4 priority buckets for the next verification pass. |

### Scholarship data ingestion

**Schema** — `types/index.ts` `Scholarship` interface. The match engine reads the core fields only; verification metadata fields are all optional and backward-compatible.

**Verification status values:**

| `verification_status` | Meaning |
|---|---|
| `"mock"` | Hackathon placeholder — criteria approximated, not source-verified |
| `"needs_review"` | Real scholarship in staging; awaits human spot-check against `source_url` |
| `"verified"` | Manually confirmed against `source_url` and promoted to production |

**Adding a real scholarship (step-by-step):**

```bash
# 1. Get a blank template
npx tsx scripts/add-scholarship.ts --template > my-draft.json

# 2. Fill every field — especially source_url (the exact page where you read the criteria)
#    Use scripts/scholarship-template.json as an annotated reference.

# 3. Stage the record (validates required fields, assigns ID, timestamps)
npx tsx scripts/add-scholarship.ts my-draft.json

# 4. Check what's waiting in staging
npx tsx scripts/add-scholarship.ts --list-staging

# 5. Second person reviews: open source_url, cross-check every field manually
#    Edit the staging record directly if corrections are needed.

# 6. Promote to production
npx tsx scripts/add-scholarship.ts --promote sc-037
```

**Key validation rules enforced by the script:**
- `source_url` must be a full `https://` URL (not the root domain — the exact criteria page)
- `deadline` must be `YYYY-MM-DD`
- `course_levels` must be a subset of `[Class 11, Class 12, UG, PG, Diploma]`
- `source_type` must be one of `[government, ngo, private, institution]`
- `disability_requirement` must be one of `[required, preferred, not_applicable]`
- `min_marks` and `income_limit` must be a number **or `null`** (null = no requirement). The validator accepts null explicitly — do not treat it as missing.

**Never edit `data/scholarships.json` directly** for new real entries — always go through the staging pipeline so every record has a `source_url` and a `last_verified_at` timestamp.

**Semantic correctness rule:** `min_marks` must represent an academic score floor, not a disability certificate percentage or any other threshold. For DEPwD/PwD schemes, the 40% figure refers to the disability certificate requirement — that belongs in `disability_requirement: "required"` and `docs_required`, never in `min_marks`. If a scheme has no academic floor, set `min_marks: null`.

**Draft files** go in `scripts/drafts/` (gitignored source of truth for staged records before ingestion). Each draft file should be removed or archived after successful staging.

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

### Match sort order

Within each status group on `/matches`, pairs are sorted by:

1. **Score descending** (primary) — higher match score first
2. **Verification rank ascending** (secondary, tie-breaker) — `verified` (0) before `needs_review` (1) before `mock`/absent (2)

This is implemented in `sortPairs()` in `app/matches/page.tsx` and applied per group after filtering. The sort does not change eligibility status or score values.

A **"Verified only" toggle** on the matches page filters `displayPairs` to `verification_status === "verified"` before grouping. It is off by default. The subtitle copy adapts per toggle state:

| Toggle state | Subtitle format |
|---|---|
| Off, strong matches exist | `N strong matches found · M scholarships checked` |
| Off, no strong matches | `M scholarships checked · no strong matches yet` |
| On | `N verified records shown · M checked in total` |

`displayPairs.length` drives the verified count; `totalChecked` (`pairs.length`) always reflects the full unfiltered dataset so users know the filter is a subset.

### Verification UI

`components/VerificationBadge.tsx` renders a small pill for any `VerificationStatus` value:

| Status | Appearance | Badge wording | Detail page label |
|--------|------------|---------------|-------------------|
| `verified` | Emerald, checkmark icon | "Source verified" | **Source verified:** |
| `needs_review` | Slate/muted, clock icon | "Pending verification" | **Pending verification:** |
| `mock` / absent | Amber, info icon | "Under review" | **Under review:** |

Badge wording and detail page prose labels are kept intentionally consistent. Do not change one without updating the other.

**Where the badge appears:**
- `ScholarshipCard` — bottom of card, `xs` size, same visual weight as tag pills
- `/scholarship/[id]` header — inline with the source-type pill and deadline badge, `sm` size

**Transparency section on the detail page** is status-aware:
- `verified` — green-tinted panel; shows `source_name`, `last_verified_at` (formatted date), and a "View source ↗" link to `source_url`; shows `verification_note` if present
- `needs_review` — amber panel; notes the record is sourced from an official portal but not yet spot-checked; shows `source_name` if available
- `mock` — amber panel; states the record is based on official scheme information but not yet source-verified; tells users to confirm on the official page before applying

All three variants use Tailwind `dark:` classes and work in both themes.

**Trust messaging — homepage (`app/page.tsx`):**
The third card in the "Built with transparency" section (`TRUST` array) renders dynamically: it imports `data/scholarships.json` at module level, counts `verification_status === "verified"` records, and renders `"N of M scholarships have been manually verified against official government sources…"`. This updates automatically when records are promoted — no code change needed.

**Trust messaging — matches page (`app/matches/page.tsx`):**
The bottom ethics note renders: `"N of M scholarships are source-verified · more are being reviewed and will be added progressively."` where N = `verifiedCount` (computed from `pairs`) and M = `totalChecked` (`pairs.length`).

**Verified-only empty state (`app/matches/page.tsx`):**
When the "Verified only" toggle is active and `displayPairs.length === 0`, a `VerifiedOnlyEmptyState` component renders instead of the normal empty state. It explains that no source-verified scholarships match the current profile and offers a "Show all records instead" button that calls `setVerifiedOnly(false)`. A secondary line clarifies what under-review records are.

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

These are read in `lib/rateLimit.ts`. The module applies different behaviour based on `NODE_ENV`:

- **`production` + missing vars** → module throws at startup (`Error: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production`). The Vercel function cold-starts will fail immediately and visibly — rate limiting cannot be silently skipped in production.
- **non-production + missing vars** → fail-open: all checks return `null` with a one-time `console.warn`. Local dev works without Upstash credentials.
- **vars present (any env)** → normal rate limiting enforced.

Get the values from the Upstash console after creating a Redis database (or via the Upstash integration in the Vercel marketplace).

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

### Lint suppressions

Three `react-hooks/set-state-in-effect` errors are suppressed with `// eslint-disable-next-line` comments in:

- `components/ThemeToggle.tsx` — `setDark()` after reading `localStorage`
- `app/scholarship/[id]/MatchSection.tsx` — `setProfile()` after reading `sessionStorage`
- `app/matches/page.tsx` — `runMatch()` after reading `sessionStorage`

All three are false positives: `localStorage`/`sessionStorage` are browser-only APIs unavailable during SSR — `useEffect` is the only correct location for them in Next.js. Do not remove these suppressions without also restructuring the reads to be SSR-safe.

### `@/` path alias

`@/` maps to the project root (configured in `tsconfig.json`). Use it for all internal imports.
