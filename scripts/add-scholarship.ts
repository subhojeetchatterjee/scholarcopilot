/**
 * ScholarCopilot — Scholarship ingestion script
 *
 * Usage:
 *   npx tsx scripts/add-scholarship.ts path/to/draft.json
 *   npx tsx scripts/add-scholarship.ts --template      (prints a blank template to stdout)
 *   npx tsx scripts/add-scholarship.ts --list-staging  (lists records in staging)
 *   npx tsx scripts/add-scholarship.ts --promote <id>  (moves record from staging → main dataset)
 *
 * Workflow:
 *   1. Copy scripts/scholarship-template.json → my-draft.json
 *   2. Fill in all fields; add source_url pointing to the exact official page
 *   3. Run: npx tsx scripts/add-scholarship.ts my-draft.json
 *   4. Script validates, assigns ID, appends to data/scholarships-staging.json
 *   5. A second person manually reviews the staging record against the source_url
 *   6. When satisfied: npx tsx scripts/add-scholarship.ts --promote <id>
 *      (moves it to data/scholarships.json with verification_status: "verified")
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const STAGING    = path.join(ROOT, "data", "scholarships-staging.json");
const MAIN       = path.join(ROOT, "data", "scholarships.json");

// ── Required fields and their expected types ──────────────────────────────────

const REQUIRED: Record<string, string> = {
  name:                   "string",
  provider:               "string",
  official_url:           "string (root or landing page URL shown to students)",
  source_url:             "string (exact deep-link URL where YOU verified the criteria)",
  source_name:            "string (e.g. 'National Scholarship Portal — CSS scheme page')",
  deadline:               "string YYYY-MM-DD",
  states_allowed:         "array — ['ALL'] or list of state names",
  category_allowed:       "array — ['ALL'] or subset of [General,SC,ST,OBC,EWS,NT,Other]",
  gender_allowed:         "array — ['ALL'] or subset of [Male,Female,Transgender]",
  disability_requirement: "string — 'required' | 'preferred' | 'not_applicable'",
  course_levels:          "array — subset of [Class 11, Class 12, UG, PG, Diploma]",
  summary:                "string — 1–3 sentence plain-language description",
  docs_required:          "array of strings",
  source_type:            "string — 'government' | 'ngo' | 'private' | 'institution'",
  source_note:            "string — human-readable provenance note shown in UI",
  verification_note:      "string — notes on anything ambiguous or provisional",
};

// Fields that are required to be present but may legitimately be null
const NULLABLE_REQUIRED = new Set(["min_marks", "income_limit"]);

const VALID_SOURCE_TYPES    = ["government", "ngo", "private", "institution"];
const VALID_DISABILITY      = ["required", "preferred", "not_applicable"];
const VALID_COURSE_LEVELS   = ["Class 11", "Class 12", "UG", "PG", "Diploma"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJSON(filePath: string): unknown[] {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as unknown[];
  } catch {
    return [];
  }
}

function saveJSON(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function nextId(existing: unknown[]): string {
  const nums = (existing as Array<{ id?: string }>)
    .map((r) => parseInt(r.id?.replace("sc-", "") ?? "0", 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `sc-${String(max + 1).padStart(3, "0")}`;
}

function fail(msg: string): never {
  console.error(`\n✗  ${msg}\n`);
  process.exit(1);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(draft: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const [field, desc] of Object.entries(REQUIRED)) {
    const val = draft[field];
    if (NULLABLE_REQUIRED.has(field)) {
      // null is valid ("no requirement"); only reject if truly absent
      if (val === undefined) {
        errors.push(`Missing required field: "${field}" (${desc})`);
      } else if (val !== null && typeof val !== "number") {
        errors.push(`Field "${field}" must be a number or null, got: ${JSON.stringify(val)}`);
      }
    } else {
      if (val === undefined || val === null || val === "") {
        errors.push(`Missing required field: "${field}" (${desc})`);
      }
    }
  }

  if (draft.source_type && !VALID_SOURCE_TYPES.includes(draft.source_type as string)) {
    errors.push(`source_type must be one of: ${VALID_SOURCE_TYPES.join(", ")}`);
  }

  if (draft.disability_requirement && !VALID_DISABILITY.includes(draft.disability_requirement as string)) {
    errors.push(`disability_requirement must be one of: ${VALID_DISABILITY.join(", ")}`);
  }

  if (Array.isArray(draft.course_levels)) {
    const invalid = (draft.course_levels as string[]).filter(
      (l) => !VALID_COURSE_LEVELS.includes(l)
    );
    if (invalid.length > 0) {
      errors.push(`Invalid course_levels: ${invalid.join(", ")}. Valid: ${VALID_COURSE_LEVELS.join(", ")}`);
    }
  }

  if (draft.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(draft.deadline as string)) {
    errors.push(`deadline must be ISO format YYYY-MM-DD, got: "${draft.deadline}"`);
  }

  if (draft.source_url && !(draft.source_url as string).startsWith("http")) {
    errors.push(`source_url must be a full URL starting with http(s)://`);
  }

  return errors;
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdTemplate(): void {
  const template = {
    name:                   "FILL: Official scholarship name as it appears on the source page",
    provider:               "FILL: Awarding body (ministry / foundation / university)",
    official_url:           "FILL: Root or landing page URL shown to students",
    source_url:             "FILL: Exact URL of the page where YOU read the criteria",
    source_name:            "FILL: e.g. 'National Scholarship Portal — Central Sector Scheme'",
    deadline:               "FILL: YYYY-MM-DD (or best known deadline — note if approximate)",
    states_allowed:         ["ALL"],
    min_marks:              null,
    income_limit:           null,
    category_allowed:       ["ALL"],
    gender_allowed:         ["ALL"],
    disability_requirement: "not_applicable",
    course_levels:          ["UG"],
    summary:                "FILL: 1–3 sentence plain-language description of the scholarship",
    docs_required:          ["FILL: document 1", "FILL: document 2"],
    source_type:            "government",
    source_note:            "FILL: One sentence describing where data was sourced from",
    verification_note:      "FILL: Note any criteria that were ambiguous or could not be confirmed",
    ambiguous_fields:       [],
  };
  console.log(JSON.stringify(template, null, 2));
}

function cmdListStaging(): void {
  const staging = loadJSON(STAGING) as Array<Record<string, unknown>>;
  if (staging.length === 0) {
    console.log("Staging is empty. No records awaiting review.");
    return;
  }
  console.log(`\n${staging.length} record(s) in staging:\n`);
  for (const r of staging) {
    console.log(`  ${r.id}  ${r.name}`);
    console.log(`         source_url: ${r.source_url ?? "(none)"}`);
    console.log(`         added:      ${r.last_verified_at ?? "unknown"}`);
    console.log();
  }
}

function cmdAdd(draftPath: string): void {
  let raw: string;
  try {
    raw = readFileSync(draftPath, "utf-8");
  } catch {
    fail(`Cannot read file: ${draftPath}`);
  }

  let draft: Record<string, unknown>;
  try {
    draft = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    fail(`File is not valid JSON: ${draftPath}`);
  }

  const errors = validate(draft);
  if (errors.length > 0) {
    console.error("\n✗  Validation failed:\n");
    errors.forEach((e) => console.error(`   • ${e}`));
    console.error();
    process.exit(1);
  }

  // Merge all existing IDs to find next available
  const mainData    = loadJSON(MAIN);
  const stagingData = loadJSON(STAGING);
  const allExisting = [...mainData, ...stagingData];

  const id    = nextId(allExisting);
  const today = new Date().toISOString().slice(0, 10);

  const record = {
    id,
    ...draft,
    verification_status: "needs_review",
    last_verified_at:    today,
  };

  stagingData.push(record);
  saveJSON(STAGING, stagingData);

  console.log(`\n✓  Added to staging: ${id} — "${draft.name}"`);
  console.log(`   File: data/scholarships-staging.json`);
  console.log(`   Next step: review against source_url, then run --promote ${id}\n`);
}

function cmdPromote(id: string): void {
  const stagingData = loadJSON(STAGING) as Array<Record<string, unknown>>;
  const idx = stagingData.findIndex((r) => r.id === id);
  if (idx === -1) {
    fail(`No record with id "${id}" found in staging.`);
  }

  const record = { ...stagingData[idx], verification_status: "verified" };
  const mainData = loadJSON(MAIN) as Array<Record<string, unknown>>;

  if (mainData.some((r) => r.id === id)) {
    fail(`id "${id}" already exists in the main dataset.`);
  }

  mainData.push(record);
  stagingData.splice(idx, 1);

  saveJSON(MAIN, mainData);
  saveJSON(STAGING, stagingData);

  console.log(`\n✓  Promoted ${id} to data/scholarships.json (verification_status: verified)`);
  console.log(`   Removed from staging.\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args[0] === "--template") {
  cmdTemplate();
} else if (args[0] === "--list-staging") {
  cmdListStaging();
} else if (args[0] === "--promote") {
  if (!args[1]) fail("Usage: --promote <scholarship-id>");
  cmdPromote(args[1]);
} else if (args[0] && !args[0].startsWith("--")) {
  cmdAdd(args[0]);
} else {
  console.log(`
ScholarCopilot — Scholarship ingestion script

Usage:
  npx tsx scripts/add-scholarship.ts <draft.json>    Add a new scholarship to staging
  npx tsx scripts/add-scholarship.ts --template      Print a blank template to stdout
  npx tsx scripts/add-scholarship.ts --list-staging  List records awaiting review
  npx tsx scripts/add-scholarship.ts --promote <id>  Promote a staged record to production
`);
}
