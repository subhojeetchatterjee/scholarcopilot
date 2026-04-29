export type IncomeRange =
  | "below_1L"
  | "1L_to_2.5L"
  | "2.5L_to_5L"
  | "5L_to_8L"
  | "above_8L";

export type Category =
  | "General"
  | "SC"
  | "ST"
  | "OBC"
  | "EWS"
  | "NT"
  | "Other";

export type Gender = "Male" | "Female" | "Transgender" | "Prefer not to say";

export type CourseLevel =
  | "Class 11"
  | "Class 12"
  | "UG"
  | "PG"
  | "Diploma";

export type InstitutionType =
  | "Government School"
  | "Private School"
  | "Government College"
  | "Private College"
  | "Deemed University"
  | "IIT/NIT/IIIT"
  | "Other";

export type SourceType = "government" | "ngo" | "private" | "institution";

// "verified"    → criteria manually confirmed against the official source URL
// "needs_review"→ real scholarship added to staging; awaits human spot-check
// "mock"        → hackathon placeholder; do not treat as authoritative
export type VerificationStatus = "verified" | "needs_review" | "mock";

// ── Student profile ───────────────────────────────────────────────────────────

export interface StudentProfile {
  full_name: string;
  age: number;
  state: string;
  class_or_degree: string;
  institution_type: InstitutionType;
  annual_family_income_range: IncomeRange;
  category: Category;
  gender: Gender;
  disability_status: boolean;
  score_type: "percentage" | "cgpa";
  raw_score: number;
  cgpa_scale: "10" | "4" | null;
  conversion_method: "none" | "cbse_9_5" | "x10" | "manual_percentage";
  normalized_percentage: number; // always 0–100 after validation
  preferred_language: "en" | "hi" | "bn";
  career_goal: string;
}

// ── Scholarship record ────────────────────────────────────────────────────────

export interface Scholarship {
  // ── Core fields (required by match engine) ────────────────────────────────
  id: string;
  name: string;
  provider: string;
  official_url: string;        // landing page shown to students — may be root domain
  deadline: string;            // ISO date YYYY-MM-DD
  states_allowed: string[];    // ["ALL"] means no state restriction
  min_marks: number | null;
  income_limit: number | null; // annual family income ceiling in INR
  category_allowed: string[];  // ["ALL"] means open to all
  gender_allowed: string[];    // ["ALL"] means open to all genders
  disability_requirement: "required" | "preferred" | "not_applicable";
  course_levels: CourseLevel[];
  summary: string;
  docs_required: string[];
  source_type: SourceType;
  source_note: string;         // human-readable provenance note shown in the UI

  // ── Verification metadata (optional; absent on legacy mock entries) ───────
  verification_status?: VerificationStatus;
  source_url?: string;         // exact deep-link where criteria were verified
  source_name?: string;        // authoritative source document or portal name
  last_verified_at?: string;   // ISO date YYYY-MM-DD of last manual spot-check
  verification_note?: string;  // free-form notes on ambiguous or provisional criteria
  ambiguous_fields?: string[]; // field names whose values could not be confirmed exactly
}

// ── Match result ──────────────────────────────────────────────────────────────

export type MatchStatus =
  | "eligible"
  | "maybe_eligible"
  | "insufficient_data"
  | "not_eligible";

export interface MatchResult {
  scholarship_id: string;
  status: MatchStatus;
  score: number; // 0–100, used for ranking
  match_reasons: string[];
  missing_reasons: string[];
}

// ── API payloads ──────────────────────────────────────────────────────────────

export interface MatchResponse {
  results: MatchResult[];
  scholarships: Scholarship[]; // full records, same order as results
}

export interface ExplainRequest {
  profile: StudentProfile;
  scholarship: Scholarship;
  match_result: MatchResult;
  language: "en" | "hi" | "bn";
}

export interface FollowUpRequest {
  profile: Partial<StudentProfile>;
  scholarship: Scholarship;
  match_result: MatchResult;
  language?: "en" | "hi" | "bn";
}

export interface DraftAnswerRequest {
  profile: StudentProfile;
  scholarship: Scholarship;
  prompt: string;
  language?: "en" | "hi" | "bn";
}
