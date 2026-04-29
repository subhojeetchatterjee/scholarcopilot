import type {
  StudentProfile,
  Scholarship,
  MatchResult,
  MatchStatus,
  CourseLevel,
} from "@/types";

// ── Income band table ─────────────────────────────────────────────────────────
// Each IncomeRange maps to an inclusive [min, max] in INR.
//
// Three-way comparison against scholarship.income_limit:
//   band.max  <= limit  →  income definitely within limit  (match)
//   band.min  >  limit  →  income definitely above limit   (hard fail)
//   otherwise           →  band overlaps limit             (uncertain → missing++)

const INCOME_BAND: Record<string, { min: number; max: number }> = {
  below_1L:    { min: 0,       max: 100_000 },
  "1L_to_2.5L":{ min: 100_001, max: 250_000 },
  "2.5L_to_5L":{ min: 250_001, max: 500_000 },
  "5L_to_8L":  { min: 500_001, max: 800_000 },
  above_8L:    { min: 800_001, max: Infinity },
};

function fmtL(n: number): string {
  return n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
}

// Docs that imply a parent/guardian service status requirement — no StudentProfile
// field covers this, so such scholarships must always surface as insufficient_data.
const SERVICE_DOC_RE = /service certificate|serviceman|parent.*service|death.*disab/i;

// ── Course-level normaliser ───────────────────────────────────────────────────
// Profile forms send exact CourseLevel values from dropdowns; this also handles
// free-text entries so the engine degrades gracefully.

const EXACT_LEVELS: CourseLevel[] = ["Class 11", "Class 12", "UG", "PG", "Diploma"];

function normalizeCourseLevel(raw: string): CourseLevel | null {
  if (EXACT_LEVELS.includes(raw as CourseLevel)) return raw as CourseLevel;
  const s = raw.toLowerCase().trim();
  if (/class\s*11|11th|\bxi\b/.test(s))  return "Class 11";
  if (/class\s*12|12th|\bxii\b/.test(s)) return "Class 12";
  if (/diploma|polytechnic/.test(s))     return "Diploma";
  if (/\bpg\b|master|m\.?tech|m\.?sc|mba|mca|\bllm\b|m\.?pharma|m\.?d\b/.test(s)) return "PG";
  if (/\bug\b|bachelor|b\.?tech|b\.?e\b|b\.?sc|b\.?com|b\.?a\b|bca|bba|\bllb\b|mbbs|bds/.test(s)) return "UG";
  return null;
}

// Score cap for not_eligible results — keeps them visually distinct from
// maybe_eligible (capped at 70) while still reflecting partial compatibility.
const NOT_ELIGIBLE_CAP = 39;

// ── Core matching function ────────────────────────────────────────────────────

function matchOne(profile: Partial<StudentProfile>, sc: Scholarship): MatchResult {
  const matchR:   string[] = [];
  const missingR: string[] = [];
  // Base 60 is only carried through to the final score when there are no hard
  // blockers. For not_eligible results, score = accumulated bonuses only (score − 60).
  let score        = 60;
  let missingCount = 0;
  const hardFails:        string[] = [];
  const structuralMissing: string[] = [];

  // ── 1. STATE ─────────────────────────────────────────────────────────────
  if (!profile.state) {
    missingCount++;
    missingR.push("State not provided");
  } else if (sc.states_allowed.includes("ALL")) {
    matchR.push("Open to students from all states");
  } else if (sc.states_allowed.includes(profile.state)) {
    matchR.push(`State (${profile.state}) matches`);
    score += 15; // specific state match bonus
  } else {
    hardFails.push(`Not available for students from ${profile.state}`);
  }

  // ── 2. COURSE LEVEL ───────────────────────────────────────────────────────
  if (!profile.class_or_degree) {
    missingCount++;
    missingR.push("Course or class not provided");
  } else {
    const level = normalizeCourseLevel(profile.class_or_degree);
    if (!level) {
      missingCount++;
      missingR.push(`Cannot determine course level from "${profile.class_or_degree}"`);
    } else if (!sc.course_levels.includes(level)) {
      hardFails.push(`${level} is not covered by this scholarship`);
    } else {
      matchR.push(`Course level (${level}) is eligible`);
    }
  }

  // ── 3. CATEGORY ───────────────────────────────────────────────────────────
  if (!profile.category) {
    missingCount++;
    missingR.push("Category not provided");
  } else if (sc.category_allowed.includes("ALL")) {
    matchR.push("Open to all categories");
  } else if (sc.category_allowed.includes(profile.category)) {
    matchR.push(`Category (${profile.category}) matches`);
    score += 10; // specific category match bonus
  } else {
    hardFails.push(`Category ${profile.category} is not eligible`);
  }

  // ── 4. GENDER ─────────────────────────────────────────────────────────────
  if (!profile.gender) {
    missingCount++;
    missingR.push("Gender not provided");
  } else if (sc.gender_allowed.includes("ALL")) {
    matchR.push("Open to all genders");
  } else if (sc.gender_allowed.includes(profile.gender)) {
    matchR.push(`Gender (${profile.gender}) matches`);
  } else {
    hardFails.push(`Scholarship is for ${sc.gender_allowed.join("/")} students only`);
  }

  // ── 5. MARKS ──────────────────────────────────────────────────────────────
  // Uses normalized_percentage (always 0–100) regardless of original score type.
  if (sc.min_marks !== null) {
    if (profile.normalized_percentage == null) {
      missingCount++;
      missingR.push(`Score not provided (minimum required: ${sc.min_marks}%)`);
    } else if (profile.normalized_percentage < sc.min_marks) {
      hardFails.push(
        `Score (${profile.normalized_percentage}%) below minimum (${sc.min_marks}%)`
      );
    } else {
      matchR.push(
        `Score (${profile.normalized_percentage}%) meets ${sc.min_marks}% minimum`
      );
      if (profile.normalized_percentage >= sc.min_marks + 10) {
        score += 10; // well above minimum bonus
        matchR.push("Score exceeds minimum by 10+ points");
      }
    }
  } else {
    matchR.push("No minimum marks required");
  }

  // ── 6. INCOME ─────────────────────────────────────────────────────────────
  // Uses three-way band comparison — avoids penalising students whose band
  // only partially overlaps the limit (they get maybe_eligible, not hard fail).
  if (sc.income_limit !== null) {
    if (!profile.annual_family_income_range) {
      missingCount++;
      missingR.push(`Family income not provided (limit: ${fmtL(sc.income_limit)})`);
    } else {
      const band = INCOME_BAND[profile.annual_family_income_range];
      if (band.min > sc.income_limit) {
        hardFails.push(
          `Income band (${profile.annual_family_income_range}) is above the ${fmtL(sc.income_limit)} limit`
        );
      } else if (band.max <= sc.income_limit) {
        matchR.push(`Family income is within the ${fmtL(sc.income_limit)} limit`);
      } else {
        // Band overlaps: lower end fits, upper end may not
        missingCount++;
        missingR.push(
          `Income band (${profile.annual_family_income_range}) partially overlaps ${fmtL(sc.income_limit)} limit — verify with certificate`
        );
      }
    }
  } else {
    matchR.push("No income limit for this scholarship");
  }

  // ── 7. DISABILITY ─────────────────────────────────────────────────────────
  // "required"    → only students with disability qualify (hard fail if false)
  // "preferred"   → disability gives a bonus but is not mandatory
  // "not_applicable" → not a criterion; ignore disability_status entirely
  const dr = sc.disability_requirement;
  if (dr === "required") {
    if (profile.disability_status == null) {
      missingCount++;
      missingR.push("Disability status required but not provided");
    } else if (!profile.disability_status) {
      hardFails.push("Scholarship is exclusively for students with disabilities");
    } else {
      matchR.push("Disability status meets requirement");
    }
  } else if (dr === "preferred") {
    if (profile.disability_status) {
      score += 5;
      matchR.push("Disability noted — additional support provisions apply");
    }
    // no impact if disability_status is false or missing
  }
  // "not_applicable": no check

  // ── 8. DEADLINE BONUS ─────────────────────────────────────────────────────
  const daysLeft = Math.ceil(
    (new Date(sc.deadline).getTime() - Date.now()) / 86_400_000
  );
  if (daysLeft > 30) {
    score += 5;
  } else if (daysLeft <= 0) {
    missingR.push("Deadline has passed — verify on the official page");
  } else {
    missingR.push(`Deadline in ${daysLeft} days — apply immediately`);
  }

  // ── STRUCTURAL MISSING ────────────────────────────────────────────────────
  // If any required document implies a family/guardian status that has no
  // corresponding StudentProfile field, we can never deterministically verify
  // eligibility — force insufficient_data so the follow-up panel appears.
  if (sc.docs_required.some((d) => SERVICE_DOC_RE.test(d))) {
    structuralMissing.push(
      "Parent or guardian's service status (e.g. CAPF/AR personnel) is required but cannot be verified from your profile — check the official page"
    );
  }

  // ── EARLY RETURN on hard fails ────────────────────────────────────────────
  // Status is driven by blockers; score is computed independently from the
  // bonuses that DID accumulate (score − 60 strips the base that only applies
  // when no blocker fires), capped so not_eligible cards never look stronger
  // than a maybe_eligible result.
  if (hardFails.length > 0) {
    const compatScore = Math.min(Math.max(0, score - 60), NOT_ELIGIBLE_CAP);
    return {
      scholarship_id: sc.id,
      status: "not_eligible",
      score: compatScore,
      match_reasons: matchR,
      missing_reasons: [...hardFails, ...missingR],
    };
  }

  // ── EARLY RETURN on structural missing ───────────────────────────────────
  if (structuralMissing.length > 0) {
    return {
      scholarship_id: sc.id,
      status: "insufficient_data",
      score: Math.max(0, Math.min(30, score)),
      match_reasons: matchR,
      missing_reasons: [...missingR, ...structuralMissing],
    };
  }

  // ── STATUS from missing count ─────────────────────────────────────────────
  // Rule: 1–2 missing required fields → maybe_eligible (score capped at 70)
  //       3+  missing required fields → insufficient_data (score capped at 30)
  let status: MatchStatus;
  if (missingCount >= 3) {
    status = "insufficient_data";
    score  = Math.min(score, 30);
  } else if (missingCount >= 1) {
    status = "maybe_eligible";
    score  = Math.min(score, 70);
  } else {
    status = "eligible";
  }

  return {
    scholarship_id: sc.id,
    status,
    score: Math.max(0, Math.min(100, score)),
    match_reasons: matchR,
    missing_reasons: missingR,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function matchScholarships(
  profile: Partial<StudentProfile>,
  scholarships: Scholarship[]
): MatchResult[] {
  return scholarships
    .map((s) => matchOne(profile, s))
    .sort((a, b) => b.score - a.score);
}

// ── Inline test profiles and expected outputs ─────────────────────────────────
//
// Run with:  node -e "require('./lib/matchEngine').runInlineTests()"
// (after ts-node or tsx is available, or transpile first)
//
// Profile A — Priya
//   Female, Maharashtra, Class 12, General, income 1L–2.5L, marks 82, no disability
//
// Profile B — Rahul
//   Male, Bihar, UG, SC, income below 1L, marks 68, no disability
//
// Profile C — Anjali
//   Female, Delhi, UG, OBC, income 2.5L–5L, marks 55, has disability
//
// Profile D — Arjun
//   Male, Karnataka, UG, General, income 5L–8L, marks 92, no disability
//
// Profile E — Incomplete
//   Only state (Delhi) and gender (Female) provided; all other fields missing
//
// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED OUTPUTS (deterministic, deadline bonus based on 2026-04-27 run date)
//
// A vs sc-004 (ALL, Class 11/12/UG/Diploma, marks 60, income 4L, ALL, ALL)
//   state ALL (+0), Class 12 ✓, category ALL (+0), gender ALL, marks 82≥60(+10),
//   income 1L-2.5L max=250k ≤ 400k ✓, +5 deadline → score 75, eligible
//
// A vs sc-013 (Maharashtra, Class 11/12/UG, SC/ST/OBC/NT, marks 50, income 2.5L)
//   state Maharashtra ✓(+15), Class 12 ✓, category General ∉ [SC,ST,OBC,NT]
//   → HARD FAIL (category). matchR has state+course+gender+income.
//   bonuses = +15(state) +10(marks≥60) +5(deadline) = 30 → score min(30,39) = 30
//
// A vs sc-001 (ALL, UG/PG, marks 80, income 4.5L)
//   Class 12 ∉ [UG, PG] → HARD FAIL (course). matchR has state+category+gender+income.
//   bonuses = 0(state ALL) +0(marks meets 80 but <90) +5(deadline) = 5 → score 5
//
// B vs sc-026 (Bihar, Class 11/12/UG, SC, marks 45, income 2.5L)
//   state Bihar ✓(+15), UG ✓, SC ✓(+10), gender ALL, marks 68≥45(+10 bonus),
//   income below_1L max=100k ≤ 250k ✓, +5 deadline → score 100, eligible
//
// B vs sc-001 (ALL, UG/PG, marks 80, income 4.5L)
//   marks 68 < 80 → HARD FAIL (marks). matchR has state+course+category+gender+income.
//   bonuses = 0(state ALL) +0(no marks bonus, hard fail) +5(deadline) = 5 → score 5
//
// B vs sc-007 (ALL, UG/PG, marks 50, income 6L, ALL)
//   state ALL, UG ✓, category ALL, gender ALL, marks 68≥50(+10 bonus),
//   income below_1L ≤ 600k ✓, +5 deadline → score 75, eligible
//
// C vs sc-003 (ALL, all levels, marks 40, income 2.5L, disability required)
//   income 2.5L-5L min=250001 > income_limit 250000 → HARD FAIL (income).
//   matchR has state+course+category+gender+marks+disability.
//   bonuses = 0(state ALL) +10(marks 66.5≥50+10) +5(deadline) = 15 → score 15
//
// C vs sc-034 (Delhi, UG/PG/Diploma, marks 60, income 2L, disability preferred)
//   state Delhi ✓(+15), UG ✓, marks 55 < 60 → HARD FAIL (marks).
//   income 2.5L-5L min=250001 > 200000 → HARD FAIL (income).
//   matchR has state+course+category+gender+disability_preferred.
//   bonuses = +15(state) +5(disability preferred) +5(deadline) = 25 → score 25
//
// C vs sc-010 (ALL, UG/Diploma, Female, no marks, income 8L)
//   state ALL, UG ✓, category ALL, gender Female ✓, no min_marks ✓,
//   income 2.5L-5L max=500k ≤ 800k ✓, +5 deadline → score 65, eligible
//
// D vs sc-011 (ALL, UG/PG, marks 75, no income limit)
//   state ALL, UG ✓, category ALL, gender ALL, marks 92≥75(+10 bonus),
//   no income limit ✓, +5 deadline → score 75, eligible
//
// D vs sc-022 (Karnataka, UG, marks 70, income 6L)
//   state Karnataka ✓(+15), UG ✓, category ALL, gender ALL, marks 92≥70(+10 bonus),
//   income 5L-8L: min=500001 ≤ 600000 but max=800000 > 600000 → overlapping band
//   → missingCount=1 → maybe_eligible, raw=90 capped at 70
//
// D vs sc-005 (ALL, UG, marks 60, income 15L)
//   marks 92≥60(+10 bonus), income 5L-8L max=800k ≤ 1.5M ✓, +5 deadline
//   → score 75, eligible
//
// E vs sc-035 (Delhi, UG, Female, marks 65, income 4L)
//   state Delhi ✓(+15), course missing(+1), category missing(+1),
//   gender Female ✓, marks missing(+1), income missing(+1)
//   missingCount=4 → insufficient_data, score capped at 30
//
// E vs sc-010 (ALL, UG/Diploma, Female, no marks, income 8L)
//   state ALL, course missing(+1), category missing(+1),
//   gender Female ✓, no min_marks ✓ (not counted), income missing(+1)
//   missingCount=3 → insufficient_data, score capped at 30
//
// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES HANDLED
//
// 1. Income band overlap (3-way logic)
//    A student with "5L_to_8L" and an income_limit of ₹6L:
//    min(500001) ≤ 600000 < max(800000) → uncertain, not a hard fail.
//    They get maybe_eligible instead of not_eligible, which is correct because
//    their actual income might be 5.2L (within limit) or 7.8L (above it).
//
// 2. Disability trichotomy
//    "required" → hard fail when disability_status=false (sc-003)
//    "preferred" → adds +5 score bonus if disability_status=true (sc-034)
//    "not_applicable" → disability_status is never checked
//    Missing disability_status on a "required" scholarship counts toward missing,
//    not an immediate hard fail, so the user can provide data and re-check.
//
// 3. Multiple hard fails
//    All hard fails are collected before returning, but the result returns only
//    the first logical failure reason to keep UI messages actionable.
//    (Current impl returns all hardFails in missing_reasons for transparency.)
//
// 4. Course-level normaliser returns null
//    If the engine cannot parse the class_or_degree string, it increments
//    missingCount (not a hard fail), so the student still gets a partial result.
//
// 5. Past deadlines
//    Deadline bonus is skipped; a warning is appended to missing_reasons so the
//    UI can surface it. The scholarship is not disqualified — the student should
//    verify on the official page.
//
// 6. Score clamping
//    Raw scores are clamped to [0, 100] before returning, and separately capped
//    at 70 (maybe_eligible) or 30 (insufficient_data) regardless of raw score.
//    This prevents a student with a perfect state+category+marks bonus from
//    appearing "confident" when data is missing.
//
// 7. Fully missing profile
//    If all eligibility fields are absent, missingCount reaches 7+ →
//    insufficient_data for every scholarship, score ≤ 30.
//    This triggers the follow-up question flow (Step 10).

// Test profiles covering percentage and CGPA score paths.
// normalized_percentage values (for matching): Priya=82, Rahul=68, Anjali=66.5, Arjun=92.
export const TEST_PROFILES = {
  // Percentage score — Maharashtra, Class 12, General, 82%
  priya: {
    full_name: "Priya Sharma",
    age: 17,
    state: "Maharashtra",
    class_or_degree: "Class 12",
    institution_type: "Government School" as const,
    annual_family_income_range: "1L_to_2.5L" as const,
    category: "General" as const,
    gender: "Female" as const,
    disability_status: false,
    score_type: "percentage" as const,
    raw_score: 82,
    cgpa_scale: null,
    conversion_method: "none" as const,
    normalized_percentage: 82,
    preferred_language: "en" as const,
    career_goal: "Engineering",
  },
  // Percentage score — Bihar, UG, SC, 68%
  rahul: {
    full_name: "Rahul Kumar",
    age: 19,
    state: "Bihar",
    class_or_degree: "UG",
    institution_type: "Government College" as const,
    annual_family_income_range: "below_1L" as const,
    category: "SC" as const,
    gender: "Male" as const,
    disability_status: false,
    score_type: "percentage" as const,
    raw_score: 68,
    cgpa_scale: null,
    conversion_method: "none" as const,
    normalized_percentage: 68,
    preferred_language: "hi" as const,
    career_goal: "Computer Science",
  },
  // CGPA score — Delhi, UG, OBC, CGPA 7.0/10 using cbse_9_5 → 66.5%
  anjali: {
    full_name: "Anjali Singh",
    age: 20,
    state: "Delhi",
    class_or_degree: "UG",
    institution_type: "Government College" as const,
    annual_family_income_range: "2.5L_to_5L" as const,
    category: "OBC" as const,
    gender: "Female" as const,
    disability_status: true,
    score_type: "cgpa" as const,
    raw_score: 7.0,
    cgpa_scale: "10" as const,
    conversion_method: "cbse_9_5" as const,
    normalized_percentage: 66.5, // 7.0 × 9.5
    preferred_language: "en" as const,
    career_goal: "Law",
  },
  // CGPA score — Karnataka, UG, General, CGPA 9.2/10 using x10 → 92%
  arjun: {
    full_name: "Arjun Rao",
    age: 20,
    state: "Karnataka",
    class_or_degree: "UG",
    institution_type: "Private College" as const,
    annual_family_income_range: "5L_to_8L" as const,
    category: "General" as const,
    gender: "Male" as const,
    disability_status: false,
    score_type: "cgpa" as const,
    raw_score: 9.2,
    cgpa_scale: "10" as const,
    conversion_method: "x10" as const,
    normalized_percentage: 92, // 9.2 × 10
    preferred_language: "en" as const,
    career_goal: "Software Engineering",
  },
  incomplete: {
    state: "Delhi",
    gender: "Female" as const,
    // all other fields intentionally absent → insufficient_data flow
  } satisfies Partial<StudentProfile>,
};
