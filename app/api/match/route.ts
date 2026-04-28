import { NextRequest, NextResponse } from "next/server";
import { MatchRequestSchema, formatZodError } from "@/lib/validators";
import { matchScholarships } from "@/lib/matchEngine";
import type { Scholarship, MatchResponse } from "@/types";
import rawScholarships from "@/data/scholarships.json";

// Cast the JSON import once — it matches the Scholarship interface.
const scholarships = rawScholarships as unknown as Scholarship[];

// Build a lookup map once at module load (not per-request).
const scholarshipMap = new Map(scholarships.map((s) => [s.id, s]));

// POST /api/match
// Runs rule-based matching and returns sorted results + full scholarship records.
//
// Sample request body — percentage score:
// {
//   "profile": {
//     "full_name": "Rahul Kumar",
//     "age": 19,
//     "state": "Bihar",
//     "class_or_degree": "UG",
//     "institution_type": "Government College",
//     "annual_family_income_range": "below_1L",
//     "category": "SC",
//     "gender": "Male",
//     "disability_status": false,
//     "score_type": "percentage",
//     "raw_score": 68,
//     "cgpa_scale": null,
//     "conversion_method": "none",
//     "preferred_language": "hi",
//     "career_goal": "Computer Science"
//   }
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
  const parsed = MatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  // ── Run matching ────────────────────────────────────────────────────────────
  let results;
  try {
    results = matchScholarships(parsed.data.profile, scholarships);
  } catch (err) {
    console.error("[/api/match] matchScholarships threw:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred while matching scholarships." },
      { status: 500 }
    );
  }

  // ── Assemble response ───────────────────────────────────────────────────────
  // scholarships array mirrors results order so the client can zip them by index.
  const matchedScholarships = results.map(
    (r) => scholarshipMap.get(r.scholarship_id)!
  );

  const response: MatchResponse = {
    results,
    scholarships: matchedScholarships,
  };

  return NextResponse.json(response, { status: 200 });
}

