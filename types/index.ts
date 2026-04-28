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
  id: string;
  name: string;
  provider: string;
  official_url: string;
  deadline: string; // ISO date YYYY-MM-DD
  states_allowed: string[]; // ["ALL"] means no state restriction
  min_marks: number | null;
  income_limit: number | null; // annual family income ceiling in INR
  category_allowed: string[]; // ["ALL"] means open to all
  gender_allowed: string[]; // ["ALL"] means open to all genders
  disability_requirement: "required" | "preferred" | "not_applicable";
  course_levels: CourseLevel[];
  summary: string;
  docs_required: string[];
  source_type: SourceType;
  source_note: string;
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
