import { z } from "zod";

// ── Enum sets (keep in sync with types/index.ts) ──────────────────────────────

const InstitutionTypeEnum = z.enum([
  "Government School",
  "Private School",
  "Government College",
  "Private College",
  "Deemed University",
  "IIT/NIT/IIIT",
  "Other",
]);

const IncomeRangeEnum = z.enum([
  "below_1L",
  "1L_to_2.5L",
  "2.5L_to_5L",
  "5L_to_8L",
  "above_8L",
]);

const CategoryEnum = z.enum([
  "General",
  "SC",
  "ST",
  "OBC",
  "EWS",
  "NT",
  "Other",
]);

const GenderEnum = z.enum([
  "Male",
  "Female",
  "Transgender",
  "Prefer not to say",
]);

const LanguageEnum = z.enum(["en", "hi", "bn"]);

const ScoreTypeEnum    = z.enum(["percentage", "cgpa"]);
const CgpaScaleEnum    = z.enum(["10", "4"]);
const ConversionEnum   = z.enum(["none", "cbse_9_5", "x10", "manual_percentage"]);

// ── StudentProfile schema ─────────────────────────────────────────────────────
//
// Score field rules (enforced in superRefine):
//
//   score_type = "percentage"
//     raw_score          → 0–100 (is the percentage itself)
//     conversion_method  → must be "none"
//     cgpa_scale         → ignored (normalised to null)
//     normalized_percentage → computed as raw_score
//
//   score_type = "cgpa"
//     raw_score          → 0–10 (scale "10") or 0–4 (scale "4")
//     cgpa_scale         → required; "10" or "4"
//     conversion_method  → "cbse_9_5" | "x10" | "manual_percentage"
//       cbse_9_5         → normalized_percentage = raw_score × 9.5
//       x10              → normalized_percentage = raw_score × 10
//       manual_percentage→ client supplies normalized_percentage directly
//
//   normalized_percentage is always clamped to [0, 100] before returning.

const BaseProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name is too long")
    .transform((s) => s.trim()),

  age: z
    .number({ error: "Age must be a number" })
    .int("Age must be a whole number")
    .min(5, "Age must be at least 5")
    .max(40, "Age must be 40 or below"),

  state: z
    .string()
    .min(1, "State is required")
    .transform((s) => s.trim()),

  class_or_degree: z
    .string()
    .min(1, "Class or degree is required")
    .transform((s) => s.trim()),

  institution_type: InstitutionTypeEnum,

  annual_family_income_range: IncomeRangeEnum,

  category: CategoryEnum,

  gender: GenderEnum,

  disability_status: z.boolean({
    error: "disability_status must be true or false",
  }),

  // ── Score fields ────────────────────────────────────────────────────────────
  score_type: ScoreTypeEnum,

  raw_score: z
    .number({ error: "raw_score must be a number" })
    .min(0, "raw_score cannot be negative")
    .max(100, "raw_score cannot exceed 100"),

  cgpa_scale: CgpaScaleEnum.nullable().optional(),

  conversion_method: ConversionEnum,

  // Required only when conversion_method is "manual_percentage"; computed otherwise.
  normalized_percentage: z
    .number({ error: "normalized_percentage must be a number" })
    .min(0, "normalized_percentage cannot be negative")
    .max(100, "normalized_percentage cannot exceed 100")
    .optional(),
  // ── End score fields ────────────────────────────────────────────────────────

  preferred_language: LanguageEnum,

  career_goal: z
    .string()
    .min(1, "Career goal is required")
    .max(300, "Career goal is too long")
    .transform((s) => s.trim()),
});

// ── Cross-field validation ────────────────────────────────────────────────────

export const StudentProfileSchema = BaseProfileSchema.superRefine(
  (data, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (data.score_type === "percentage") {
      if (data.raw_score > 100) {
        issue("raw_score", "Percentage must be between 0 and 100");
      }
      if (data.conversion_method !== "none") {
        issue(
          "conversion_method",
          'Percentage scores must use conversion_method "none"'
        );
      }
    }

    if (data.score_type === "cgpa") {
      if (!data.cgpa_scale) {
        issue(
          "cgpa_scale",
          'cgpa_scale is required for CGPA scores — use "10" or "4"'
        );
      } else {
        const maxRaw = data.cgpa_scale === "10" ? 10 : 4;
        if (data.raw_score > maxRaw) {
          issue(
            "raw_score",
            `CGPA on a ${data.cgpa_scale}-point scale must be between 0 and ${maxRaw}`
          );
        }
      }

      if (data.conversion_method === "none") {
        issue(
          "conversion_method",
          'CGPA scores require a conversion method: "cbse_9_5", "x10", or "manual_percentage"'
        );
      }

      if (
        data.conversion_method === "manual_percentage" &&
        data.normalized_percentage == null
      ) {
        issue(
          "normalized_percentage",
          'normalized_percentage is required when conversion_method is "manual_percentage"'
        );
      }
    }
  }
).transform((data) => {
  // Compute normalized_percentage from raw_score + conversion_method.
  let np: number;

  if (data.score_type === "percentage") {
    np = data.raw_score;
  } else if (data.conversion_method === "cbse_9_5") {
    np = data.raw_score * 9.5;
  } else if (data.conversion_method === "x10") {
    np = data.raw_score * 10;
  } else {
    // manual_percentage — superRefine already verified it is present
    np = data.normalized_percentage!;
  }

  return {
    ...data,
    normalized_percentage: Math.min(100, Math.max(0, Math.round(np * 100) / 100)),
    cgpa_scale: data.cgpa_scale ?? null,
  };
});

// ── Match request schema ──────────────────────────────────────────────────────

export const MatchRequestSchema = z.object({
  profile: StudentProfileSchema,
});

// ── Inferred types (use types/index.ts in business logic; these are for routes) ─

export type ValidatedProfile = z.infer<typeof StudentProfileSchema>;
export type ValidatedMatchRequest = z.infer<typeof MatchRequestSchema>;

// ── Shared error formatter ────────────────────────────────────────────────────
// Converts Zod's flatten() into a flat, human-readable fieldErrors map.

export function formatZodError(error: z.ZodError): {
  message: string;
  fields: Record<string, string>;
} {
  const flat = error.flatten();
  const fields: Record<string, string> = {};

  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fields[field] = messages[0];
    }
  }
  for (const msg of flat.formErrors) {
    fields["_form"] = msg;
    break;
  }

  return {
    message: "Validation failed. Check the fields below.",
    fields,
  };
}
