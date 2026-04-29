import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claudeClient";
import { checkRateLimit } from "@/lib/rateLimit";

const TranslateRequestSchema = z.object({
  text: z
    .string()
    .min(1, "text must not be empty")
    .max(4000, "text must be 4000 characters or fewer"),
  target_language: z.enum(["en", "hi", "bn"]),
});

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
};

export async function POST(req: NextRequest) {
  const blocked = await checkRateLimit(req, "translate");
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

  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { text, target_language } = parsed.data;
  const langName = LANG_NAMES[target_language];

  let translation: string;
  try {
    translation = await callClaude({
      system: `You are a faithful translator. Translate the given text into ${langName}.
Rules:
- Preserve the full meaning. Do not add, remove, or rephrase facts.
- Keep plain paragraph formatting. Do not add bullet points, headers, or markdown.
- If the text is already in ${langName}, return it unchanged.
- Output only the translated text — no preamble, no explanation.`,
      user: text,
      maxTokens: 800,
      model: "claude-haiku-4-5-20251001",
    });
  } catch (err) {
    console.error("[/api/translate] callClaude threw:", err);
    return NextResponse.json(
      { message: "Failed to translate. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ translation }, { status: 200 });
}
