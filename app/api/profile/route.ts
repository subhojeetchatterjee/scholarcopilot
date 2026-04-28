import { NextRequest, NextResponse } from "next/server";
import { StudentProfileSchema, formatZodError } from "@/lib/validators";

// POST /api/profile
// Validates and normalises a student profile.
// No persistence — returns the cleaned profile for client-side storage.
//
// Sample request body — percentage score:
// {
//   "full_name": "Priya Sharma",
//   "age": 17,
//   "state": "Maharashtra",
//   "class_or_degree": "Class 12",
//   "institution_type": "Government School",
//   "annual_family_income_range": "1L_to_2.5L",
//   "category": "General",
//   "gender": "Female",
//   "disability_status": false,
//   "score_type": "percentage",
//   "raw_score": 82,
//   "cgpa_scale": null,
//   "conversion_method": "none",
//   "preferred_language": "en",
//   "career_goal": "Engineering"
// }
//
// Sample request body — CGPA score (cbse_9_5):
// {
//   ...same fields...,
//   "score_type": "cgpa",
//   "raw_score": 7.0,
//   "cgpa_scale": "10",
//   "conversion_method": "cbse_9_5"
// }
//
// Sample request body — CGPA with manual percentage:
// {
//   ...same fields...,
//   "score_type": "cgpa",
//   "raw_score": 7.0,
//   "cgpa_scale": "10",
//   "conversion_method": "manual_percentage",
//   "normalized_percentage": 70
// }

export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // ── Validate ────────────────────────────────────────────────────────────────
  const parsed = StudentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  // ── Return normalised profile ────────────────────────────────────────────────
  // Transforms (trim) have already been applied by Zod.
  return NextResponse.json(
    { profile: parsed.data },
    { status: 200 }
  );
}

