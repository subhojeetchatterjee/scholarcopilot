# ScholarCopilot

Find scholarships you actually qualify for — built for Indian students in Class 11, Class 12, and undergraduate college.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/profile` | Multi-step student profile form |
| `/matches` | Ranked scholarship matches |
| `/scholarship/[id]` | Scholarship detail, checklist, and AI features |

## API Routes

| Route | Description |
|-------|-------------|
| `POST /api/profile` | Submit student profile |
| `POST /api/match` | Run rule-based matching |
| `POST /api/explain` | Claude: explain match result |
| `POST /api/followup` | Claude: ask follow-up questions for missing data |
| `POST /api/draft-answer` | Claude: draft application answer |
| `POST /api/translate` | Claude: translate content to EN / HI / BN |

## Ethics Notice

- Results are guidance only, not official eligibility decisions.
- Always verify on the official scholarship page.
- The app uses only information you provide — nothing is inferred.
- Missing data is shown as "insufficient data", never guessed.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) (Claude-powered features)
