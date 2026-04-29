import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claudeClient";
import { checkRateLimit } from "@/lib/rateLimit";
import type { DraftAnswerRequest } from "@/types";

const DraftAnswerRequestSchema = z.object({
  profile: z.object({
    full_name: z.string(),
    age: z.number(),
    state: z.string(),
    class_or_degree: z.string(),
    institution_type: z.string(),
    annual_family_income_range: z.string(),
    category: z.string(),
    gender: z.string(),
    disability_status: z.boolean(),
    normalized_percentage: z.number(),
    career_goal: z.string(),
  }),
  scholarship: z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    summary: z.string(),
    course_levels: z.array(z.string()),
    docs_required: z.array(z.string()),
  }),
  prompt: z
    .string()
    .min(5, "Prompt must be at least 5 characters")
    .max(500, "Prompt must be 500 characters or fewer")
    .transform((s) => s.trim()),
  language: z.enum(["en", "hi", "bn"]).default("en"),
  match_result_status: z.enum(["eligible", "maybe_eligible", "insufficient_data", "not_eligible"]).optional(),
});

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  en: "Write the answer in English.",
  hi: "Write the answer in Hindi (हिन्दी में लिखें).",
  bn: "Write the answer in Bengali (বাংলায় লিখুন).",
};

function buildSystemPrompt(): string {
  return `You are ScholarCopilot. Your task is to write a first-draft scholarship application answer — clean, honest prose the student can edit and submit.

Rules you must follow:
- Use only the facts provided in the student profile. Do not invent achievements, awards, grades beyond what is stated, family background details, or personal anecdotes that are not given.
- Do not exaggerate or inflate the student's qualifications, income situation, or circumstances.
- Write in a clear, simple, honest first-person voice suitable for a scholarship application.
- Keep the draft concise — 100 to 200 words unless the question clearly requires more.
- Output only the draft answer text itself. Do not add a preamble, commentary, or explanation around it.
- Do NOT open with a greeting, salutation, or the student's name. Never start with "Hi", "Hello", or any direct address to the student.
- Do NOT use emoji anywhere in the output.
- Do NOT end with a question, an offer to help further, or any interactive prompt ("Would you like…", "Let me know…", "Feel free to…").
- If the question asks for something the profile doesn't cover (e.g., a specific hardship story), leave a short bracketed placeholder like [add your own experience here] rather than inventing content.
- Do not add headers, bullet points, or formatting unless the question explicitly asks for a list.
- Adapt tone to the language requested.`;
}

function buildUserMessage(req: DraftAnswerRequest): string {
  const { profile, scholarship, prompt, language = "en" } = req;
  const langInstruction = LANGUAGE_INSTRUCTION[language];

  return `${langInstruction}

Student profile:
  Name: ${profile.full_name}
  Age: ${profile.age}
  State: ${profile.state}
  Course/Class: ${profile.class_or_degree}
  Institution type: ${profile.institution_type}
  Family income range: ${profile.annual_family_income_range}
  Category: ${profile.category}
  Gender: ${profile.gender}
  Disability: ${profile.disability_status ? "Yes" : "No"}
  Academic score: ${profile.normalized_percentage}%
  Career goal: ${profile.career_goal}

Scholarship: ${scholarship.name} (by ${scholarship.provider})
  About: ${scholarship.summary}

Application question:
"${prompt}"

Write a first-draft answer to this question using only the facts in the student profile above.`;
}

export async function POST(req: NextRequest) {
  const blocked = await checkRateLimit(req, "draft-answer");
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

  const parsed = DraftAnswerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.match_result_status === "not_eligible") {
    return NextResponse.json(
      { message: "Draft answers are not available — eligibility criteria are not met for this scholarship." },
      { status: 400 }
    );
  }

  const data = parsed.data as DraftAnswerRequest;

  let answer: string;
  try {
    answer = await callClaude({
      system: buildSystemPrompt(),
      user: buildUserMessage(data),
      maxTokens: 400,
    });
  } catch (err) {
    console.error("[/api/draft-answer] callClaude threw:", err);
    return NextResponse.json(
      { message: "Failed to generate draft. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ answer }, { status: 200 });
}
