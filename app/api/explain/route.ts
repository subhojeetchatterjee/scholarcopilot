import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claudeClient";
import { checkRateLimit } from "@/lib/rateLimit";
import type { ExplainRequest } from "@/types";

// Minimal Zod schema — trusts that the client sends valid types/index.ts shapes.
const ExplainRequestSchema = z.object({
  profile: z.object({
    full_name: z.string(),
    state: z.string(),
    class_or_degree: z.string(),
    category: z.string(),
    gender: z.string(),
    annual_family_income_range: z.string(),
    normalized_percentage: z.number(),
    disability_status: z.boolean(),
    career_goal: z.string(),
  }),
  scholarship: z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    summary: z.string(),
    course_levels: z.array(z.string()),
    states_allowed: z.array(z.string()),
    category_allowed: z.array(z.string()),
    gender_allowed: z.array(z.string()),
    min_marks: z.number().nullable(),
    income_limit: z.number().nullable(),
    disability_requirement: z.string(),
    deadline: z.string(),
  }),
  match_result: z.object({
    status: z.enum(["eligible", "maybe_eligible", "insufficient_data", "not_eligible"]),
    score: z.number(),
    match_reasons: z.array(z.string()),
    missing_reasons: z.array(z.string()),
  }),
  language: z.enum(["en", "hi", "bn"]),
});

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  en: "Respond in English.",
  hi: "Respond in Hindi (हिन्दी में उत्तर दें).",
  bn: "Respond in Bengali (বাংলায় উত্তর দিন).",
};

const STATUS_LABEL: Record<string, string> = {
  eligible: "ELIGIBLE",
  maybe_eligible: "POSSIBLY ELIGIBLE",
  insufficient_data: "INSUFFICIENT DATA",
  not_eligible: "NOT ELIGIBLE",
};

function buildSystemPrompt(): string {
  return `You are ScholarCopilot. Your task is to write a scholarship eligibility evaluation note — a static, product-style guidance card, not a chat message.

Rules you must follow:
- The deterministic match engine already decided eligibility. Your job is to explain that decision factually, not re-decide it.
- Never contradict the match_result. If status is "not_eligible", do not suggest the student might still qualify.
- Do NOT open with a greeting, salutation, or the student's name. Never start with "Hi", "Hello", or any name address.
- Do NOT use emoji anywhere in the output.
- Do NOT use motivational or emotional language ("great news", "you should be proud", "exciting opportunity", "I'm happy to help").
- Do NOT end with a question, an offer to help further, or any interactive prompt ("Would you like…", "Let me know…", "Feel free to…").
- Write in a neutral, analytical, recommendation-report tone — like a scholarship guidance note written by an advisor, not a live assistant.
- Be concise: 3–5 short paragraphs or a brief structured section. Use **bold** for key terms if helpful.
- Explain the key reasons they matched or did not match, using the provided match_reasons and missing_reasons.
- If there are missing_reasons, clearly state what must be verified or provided — be direct and factual.
- For not_eligible results where match_reasons is non-empty: structure the note in two parts — (1) 1–2 sentences acknowledging the aligned dimensions from match_reasons, then (2) a clear statement of the blocking criteria from missing_reasons, introduced with a transition such as "However, one required criterion is not met:". This is a partial match with a hard blocker, not a total mismatch. Do not ignore the matched aspects.
- For not_eligible results where match_reasons is empty: treat it as a near-total mismatch and focus entirely on the blocking criteria.
- End with a single static recommended next step (e.g., "Recommended next step: verify X on the official page before applying.").
- Do not invent eligibility criteria not present in the scholarship data.`;
}

function buildUserMessage(req: ExplainRequest): string {
  const { profile, scholarship, match_result, language } = req;
  const langInstruction = LANGUAGE_INSTRUCTION[language] ?? LANGUAGE_INSTRUCTION.en;
  const statusLabel = STATUS_LABEL[match_result.status] ?? match_result.status.toUpperCase();

  const matchReasons = match_result.match_reasons.length > 0
    ? match_result.match_reasons.map((r) => `  - ${r}`).join("\n")
    : "  (none)";

  const missingReasons = match_result.missing_reasons.length > 0
    ? match_result.missing_reasons.map((r) => `  - ${r}`).join("\n")
    : "  (none)";

  return `${langInstruction}

Student profile:
  Name: ${profile.full_name}
  State: ${profile.state}
  Course/Class: ${profile.class_or_degree}
  Category: ${profile.category}
  Gender: ${profile.gender}
  Family income range: ${profile.annual_family_income_range}
  Academic score: ${profile.normalized_percentage}%
  Disability: ${profile.disability_status ? "Yes" : "No"}
  Career goal: ${profile.career_goal}

Scholarship: ${scholarship.name} (by ${scholarship.provider})
  Summary: ${scholarship.summary}
  Eligible courses: ${scholarship.course_levels.join(", ")}
  States: ${scholarship.states_allowed.includes("ALL") ? "All states" : scholarship.states_allowed.join(", ")}
  Category: ${scholarship.category_allowed.includes("ALL") ? "All categories" : scholarship.category_allowed.join(", ")}
  Gender: ${scholarship.gender_allowed.includes("ALL") ? "All genders" : scholarship.gender_allowed.join(", ")}
  Min marks: ${scholarship.min_marks !== null ? `${scholarship.min_marks}%` : "None"}
  Income limit: ${scholarship.income_limit !== null ? `₹${(scholarship.income_limit / 100_000).toFixed(1)}L` : "None"}
  Disability requirement: ${scholarship.disability_requirement}
  Deadline: ${scholarship.deadline}

Match result: ${statusLabel} (score: ${match_result.score}/100)
Reasons matched:
${matchReasons}
Reasons missing or flagged:
${missingReasons}

Write a scholarship eligibility evaluation note based on the data above. Be factual, structured, and concise. No greetings, no emoji, no conversational filler, no closing questions.`;
}

export async function POST(req: NextRequest) {
  const blocked = await checkRateLimit(req, "explain");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = ExplainRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data as ExplainRequest;

  let explanation: string;
  try {
    explanation = await callClaude({
      system: buildSystemPrompt(),
      user: buildUserMessage(data),
      maxTokens: 600,
    });
  } catch (err) {
    console.error("[/api/explain] callClaude threw:", err);
    return NextResponse.json(
      { message: "Failed to generate explanation. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ explanation }, { status: 200 });
}
