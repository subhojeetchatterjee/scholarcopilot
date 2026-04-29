import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claudeClient";
import { checkRateLimit } from "@/lib/rateLimit";

const FollowUpRequestSchema = z.object({
  profile: z.object({
    full_name:                   z.string().optional(),
    state:                       z.string().optional(),
    class_or_degree:             z.string().optional(),
    category:                    z.string().optional(),
    gender:                      z.string().optional(),
    annual_family_income_range:  z.string().optional(),
    normalized_percentage:       z.number().optional(),
    disability_status:           z.boolean().optional(),
    career_goal:                 z.string().optional(),
    institution_type:            z.string().optional(),
  }),
  scholarship: z.object({
    name:                   z.string(),
    provider:               z.string(),
    summary:                z.string(),
    disability_requirement: z.string(),
    docs_required:          z.array(z.string()),
    income_limit:           z.number().nullable(),
    category_allowed:       z.array(z.string()),
    states_allowed:         z.array(z.string()),
  }),
  match_result: z.object({
    status:          z.enum(["eligible", "maybe_eligible", "insufficient_data", "not_eligible"]),
    missing_reasons: z.array(z.string()),
  }),
  language: z.enum(["en", "hi", "bn"]).default("en"),
});

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
};

function buildProfileSummary(profile: z.infer<typeof FollowUpRequestSchema>["profile"]): string {
  const lines: string[] = [];
  if (profile.full_name)               lines.push(`  Name: ${profile.full_name}`);
  if (profile.state)                   lines.push(`  State: ${profile.state}`);
  if (profile.class_or_degree)         lines.push(`  Course/Class: ${profile.class_or_degree}`);
  if (profile.category)                lines.push(`  Category: ${profile.category}`);
  if (profile.gender)                  lines.push(`  Gender: ${profile.gender}`);
  if (profile.annual_family_income_range) lines.push(`  Family income: ${profile.annual_family_income_range}`);
  if (profile.normalized_percentage != null) lines.push(`  Academic score: ${profile.normalized_percentage}%`);
  if (profile.disability_status != null) lines.push(`  Disability: ${profile.disability_status ? "Yes" : "No"}`);
  if (profile.institution_type)        lines.push(`  Institution type: ${profile.institution_type}`);
  if (profile.career_goal)             lines.push(`  Career goal: ${profile.career_goal}`);
  return lines.length > 0 ? lines.join("\n") : "  (no profile data provided)";
}

export async function POST(req: NextRequest) {
  const blocked = await checkRateLimit(req, "followup");
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

  const parsed = FollowUpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { profile, scholarship, match_result, language } = parsed.data;

  // Only useful for insufficient_data; return empty list for all other statuses.
  if (match_result.status !== "insufficient_data") {
    return NextResponse.json({ questions: [] }, { status: 200 });
  }

  // Nothing flagged as missing — no questions to ask.
  if (match_result.missing_reasons.length === 0) {
    return NextResponse.json({ questions: [] }, { status: 200 });
  }

  const langName = LANG_NAMES[language];
  const missingList = match_result.missing_reasons
    .map((r) => `  - ${r}`)
    .join("\n");

  const disabilityLine =
    scholarship.disability_requirement !== "not_applicable"
      ? `  Disability requirement: ${scholarship.disability_requirement}`
      : "";

  const system =
    `You are ScholarCopilot. The deterministic scholarship matching engine found "insufficient_data" for a scholarship — required eligibility information is missing from the student's profile.

Your task: generate 2–5 targeted follow-up questions to collect only the specific missing information flagged below.

Rules:
- Ask only about data missing or explicitly flagged in the "Missing / flagged reasons" list
- Never ask about fields already present in the profile
- Prioritise gating questions first (those that change eligible vs. not-eligible)
- Keep questions short, plain, written in the first person (e.g. "Do you hold a PwD certificate rated 40% or above?")
- Do not invent scholarship criteria not shown in the scholarship summary or missing reasons
- Do not ask more than 5 questions; fewer is fine if appropriate
- If there is genuinely no actionable missing information, output exactly: NONE
- Write in ${langName}
- Output ONLY one question per line — no bullets, no numbers, no extra commentary`;

  const user =
    `Known profile fields:
${buildProfileSummary(profile)}

Scholarship: ${scholarship.name} (by ${scholarship.provider})
  Summary: ${scholarship.summary}${disabilityLine ? "\n" + disabilityLine : ""}
  Documents required: ${scholarship.docs_required.join(", ")}

Match status: INSUFFICIENT DATA

Missing / flagged reasons:
${missingList}

Generate the follow-up questions now.`;

  let raw: string;
  try {
    raw = await callClaude({ system, user, maxTokens: 300 });
  } catch (err) {
    console.error("[/api/followup] callClaude threw:", err);
    return NextResponse.json(
      { message: "Failed to generate follow-up questions. Please try again." },
      { status: 502 }
    );
  }

  // Parse: one question per line; if Claude outputs "NONE", return empty list.
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === "NONE") {
    return NextResponse.json({ questions: [] }, { status: 200 });
  }

  const questions = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toUpperCase() !== "NONE");

  return NextResponse.json({ questions }, { status: 200 });
}
