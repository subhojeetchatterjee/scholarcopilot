# ScholarCopilot

ScholarCopilot helps Indian students discover scholarships they are actually likely to qualify for. It combines structured profile collection, rule-based scholarship matching, and AI-assisted guidance to make scholarship discovery clearer, faster, and safer.

## What it does

- Collects student profile information through a multi-step flow
- Matches students to scholarships using rule-based eligibility logic
- Explains why a scholarship matched or did not fully match
- Asks follow-up questions only when important eligibility details are missing
- Helps draft scholarship application answers when appropriate
- Supports multilingual output in English, Hindi, and Bengali

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

## Main routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/profile` | Multi-step student profile form |
| `/matches` | Ranked scholarship matches |
| `/scholarship/[id]` | Scholarship detail page with checklist and AI-powered guidance |

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/profile` | Submit student profile |
| `POST /api/match` | Run rule-based scholarship matching |
| `POST /api/explain` | Generate an explanation of the match result |
| `POST /api/followup` | Generate follow-up questions for missing eligibility details |
| `POST /api/draft-answer` | Draft a scholarship application answer |
| `POST /api/translate` | Translate content into English, Hindi, or Bengali |

## Ethics and safety

- Results are guidance only, not official eligibility decisions
- Always verify eligibility on the official scholarship page
- The app only uses information provided by the student
- Missing information is shown as "insufficient data" instead of being guessed

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk)

## Notes

This project was built as part of a hackathon prototype focused on making scholarship access more transparent and student-friendly.
Built by Subhojeet Chatterjee and Mahendra Mahale (Reverse Curse Gang)