/**
 * ScholarCopilot — Scholarship data audit
 *
 * Usage:
 *   npx tsx scripts/audit-scholarships.ts
 *
 * Outputs a terminal report covering:
 *   - production counts by verification_status
 *   - under-review records grouped by source_type
 *   - staged records and their deadline status
 *   - mock records that already have staged replacements
 *   - priority buckets for the next verification pass
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, "..");
const PROD_PATH    = path.join(ROOT, "data", "scholarships.json");
const STAGING_PATH = path.join(ROOT, "data", "scholarships-staging.json");

// ── Types (minimal, avoids importing from types/index.ts) ─────────────────────

interface ScholarshipRecord {
  id: string;
  name: string;
  provider: string;
  source_type: string;
  states_allowed: string[];
  category_allowed: string[];
  gender_allowed: string[];
  min_marks: number | null;
  income_limit: number | null;
  verification_status?: string;
  deadline: string;
  source_note?: string;
  verification_note?: string;
  ambiguous_fields?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function load(filePath: string): ScholarshipRecord[] {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as ScholarshipRecord[];
  } catch {
    return [];
  }
}

function hr(char = "─", width = 60): string {
  return char.repeat(width);
}

function today(): Date {
  return new Date("2026-04-29");
}

function isDeadlinePast(dateStr: string): boolean {
  return new Date(dateStr) < today();
}

function scopeLabel(sc: ScholarshipRecord): string {
  if (sc.states_allowed.includes("ALL")) return "national";
  return sc.states_allowed[0] ?? "unknown";
}

function ambiguousEligibilityFilters(sc: ScholarshipRecord): string[] {
  const fields = sc.ambiguous_fields ?? [];
  return fields.filter((f) =>
    ["min_marks", "income_limit", "category_allowed", "deadline"].includes(f)
  );
}

// ── Priority classification ────────────────────────────────────────────────────

type PriorityBucket =
  | "easy_government"
  | "state_government"
  | "private_ngo"
  | "ambiguous_or_staged";

function classifyPriority(sc: ScholarshipRecord): PriorityBucket {
  const ambiguous = ambiguousEligibilityFilters(sc);
  if (sc.source_type === "government") {
    // National government with few ambiguous filters → easiest to convert
    if (sc.states_allowed.includes("ALL") && ambiguous.length <= 1) return "easy_government";
    return "state_government";
  }
  return "private_ngo";
}

// ── Report ────────────────────────────────────────────────────────────────────

function run() {
  const prod    = load(PROD_PATH);
  const staging = load(STAGING_PATH);

  const byStatus = prod.reduce<Record<string, ScholarshipRecord[]>>((acc, r) => {
    const s = r.verification_status ?? "mock";
    (acc[s] = acc[s] ?? []).push(r);
    return acc;
  }, {});

  const mock = byStatus["mock"] ?? [];
  const verified = byStatus["verified"] ?? [];
  const needsReview = byStatus["needs_review"] ?? [];
  const mockBySourceType = mock.reduce<Record<string, ScholarshipRecord[]>>((acc, r) => {
    (acc[r.source_type] = acc[r.source_type] ?? []).push(r);
    return acc;
  }, {});

  // Map mock IDs superseded by a staged record (from source_note text)
  const supersededBy = new Map<string, ScholarshipRecord>();
  for (const s of staging) {
    const note = (s.source_note ?? "") + (s.verification_note ?? "");
    const refs = note.match(/sc-0\d\d/g) ?? [];
    for (const ref of refs) {
      if (ref !== s.id) supersededBy.set(ref, s);
    }
  }

  // Also detect mock IDs superseded by a *verified production* record (from source_note text)
  const supersededInProd = new Map<string, ScholarshipRecord>();
  for (const v of verified) {
    const note = (v.source_note ?? "") + (v.verification_note ?? "");
    const refs = note.match(/sc-0\d\d/g) ?? [];
    for (const ref of refs) {
      if (ref !== v.id) supersededInProd.set(ref, v);
    }
  }

  const stagingPastDeadline = staging.filter((s) => isDeadlinePast(s.deadline));
  const stagingOpen         = staging.filter((s) => !isDeadlinePast(s.deadline));

  // Priority buckets for mock production records not yet superseded
  const buckets: Record<PriorityBucket, ScholarshipRecord[]> = {
    easy_government:       [],
    state_government:      [],
    private_ngo:           [],
    ambiguous_or_staged:   [],
  };

  for (const r of mock) {
    if (supersededBy.has(r.id) || supersededInProd.has(r.id)) {
      buckets.ambiguous_or_staged.push(r);
    } else {
      const bucket = classifyPriority(r);
      buckets[bucket].push(r);
    }
  }

  // ── Output ──────────────────────────────────────────────────────────────────

  console.log();
  console.log("ScholarCopilot — Scholarship Data Audit");
  console.log(`Run date: ${today().toISOString().slice(0, 10)}`);
  console.log(hr("═"));

  // 1. Production counts
  console.log();
  console.log("PRODUCTION  data/scholarships.json");
  console.log(hr());
  console.log(`  Total records:          ${prod.length}`);
  console.log(`  verified:               ${verified.length}`);
  console.log(`  mock (under review):    ${mock.length}`);
  console.log(`  needs_review:           ${needsReview.length}`);

  if (verified.length > 0) {
    console.log();
    console.log("  Verified records:");
    verified.forEach((r) => console.log(`    ${r.id}  ${r.name}`));
  }

  // 2. Under-review by source type
  console.log();
  console.log("UNDER-REVIEW RECORDS BY SOURCE TYPE");
  console.log(hr());
  for (const [type, records] of Object.entries(mockBySourceType).sort()) {
    console.log(`  ${type.padEnd(12)}  ${records.length} record(s)`);
    records.forEach((r) => {
      const scope = scopeLabel(r).padEnd(18);
      const amb   = ambiguousEligibilityFilters(r);
      const ambStr = amb.length ? `  [ambiguous: ${amb.join(", ")}]` : "";
      console.log(`               ${r.id}  ${scope}  ${r.name}${ambStr}`);
    });
  }

  // 3. Staged replacements
  console.log();
  console.log("STAGED REPLACEMENTS (mock records with a staged counterpart)");
  console.log(hr());
  if (supersededBy.size === 0) {
    console.log("  None.");
  } else {
    for (const [mockId, staged] of supersededBy.entries()) {
      const deadlineFlag = isDeadlinePast(staged.deadline) ? "  ⚠ STALE DEADLINE" : "  ✓ deadline ok";
      console.log(`  ${mockId}  →  ${staged.id}  ${staged.name}${deadlineFlag}`);
    }
  }

  // 3b. Production-level superseding (verified prod record references a mock prod record)
  if (supersededInProd.size > 0) {
    console.log();
    console.log("ALREADY PROMOTED — mock still in production (safe to remove):");
    for (const [mockId, verifiedRec] of supersededInProd.entries()) {
      const inProd = mock.find((r) => r.id === mockId);
      const presentFlag = inProd ? "  ⚠ STILL IN PRODUCTION" : "  ✓ already removed";
      console.log(`  ${mockId}  →  ${verifiedRec.id}  ${verifiedRec.name}${presentFlag}`);
    }
  }

  // 4. Staging status
  console.log();
  console.log("STAGING  data/scholarships-staging.json");
  console.log(hr());
  console.log(`  Total staged:          ${staging.length}`);
  console.log(`  Blocked (past deadline): ${stagingPastDeadline.length}`);
  console.log(`  Promotable (open):     ${stagingOpen.length}`);

  if (stagingPastDeadline.length > 0) {
    console.log();
    console.log("  Blocked records — verify current-cycle deadline before promoting:");
    stagingPastDeadline.forEach((r) => {
      console.log(`    ${r.id}  ${r.deadline}  ${r.name}`);
    });
  }

  if (stagingOpen.length > 0) {
    console.log();
    console.log("  Promotable records:");
    stagingOpen.forEach((r) => {
      console.log(`    ${r.id}  ${r.deadline}  ${r.name}`);
    });
  }

  // 5. Priority buckets for next conversion pass
  console.log();
  console.log("PRIORITY BUCKETS — next verification pass");
  console.log(hr());

  console.log();
  console.log("  1. EASY GOVERNMENT  (national scope, ≤1 ambiguous eligibility filter)");
  if (buckets.easy_government.length === 0) {
    console.log("     None.");
  } else {
    buckets.easy_government.forEach((r) => {
      const amb = ambiguousEligibilityFilters(r);
      console.log(`     ${r.id}  ${r.name}`);
      console.log(`            scope: national  |  ambiguous: ${amb.length ? amb.join(", ") : "none"}`);
    });
  }

  console.log();
  console.log("  2. STATE GOVERNMENT  (state-specific portal review required)");
  if (buckets.state_government.length === 0) {
    console.log("     None.");
  } else {
    buckets.state_government.forEach((r) => {
      const amb = ambiguousEligibilityFilters(r);
      const state = scopeLabel(r);
      console.log(`     ${r.id}  ${r.name}`);
      console.log(`            scope: ${state}  |  ambiguous: ${amb.length ? amb.join(", ") : "none"}`);
    });
  }

  console.log();
  console.log("  3. PRIVATE / NGO  (criteria volatile — confirm before staging)");
  if (buckets.private_ngo.length === 0) {
    console.log("     None.");
  } else {
    buckets.private_ngo.forEach((r) => {
      console.log(`     ${r.id}  [${r.source_type}]  ${r.name}`);
    });
  }

  console.log();
  console.log("  4. ALREADY STAGED / SUPERSEDED  (promote after deadline update, or remove if already promoted)");
  if (buckets.ambiguous_or_staged.length === 0) {
    console.log("     None.");
  } else {
    buckets.ambiguous_or_staged.forEach((r) => {
      const stagedRec = supersededBy.get(r.id);
      const prodRec   = supersededInProd.get(r.id);
      if (prodRec) {
        console.log(`     ${r.id}  ${r.name}`);
        console.log(`            superseded in prod by: ${prodRec.id}  ⚠ remove mock from production`);
      } else if (stagedRec) {
        console.log(`     ${r.id}  ${r.name}`);
        console.log(`            staged as: ${stagedRec.id}  |  deadline: ${stagedRec.deadline}  ⚠ stale`);
      }
    });
  }

  // 6. Summary action list
  console.log();
  console.log(hr("═"));
  console.log("ACTION SUMMARY");
  console.log(hr("═"));
  console.log(`  → Promote from staging:       Update deadline on ${stagingPastDeadline.length} staged record(s), then promote`);
  console.log(`  → Easy next conversions:      ${buckets.easy_government.length} national government record(s) ready to draft`);
  console.log(`  → State portal reviews needed: ${buckets.state_government.length} record(s)`);
  console.log(`  → Private/NGO to verify:      ${buckets.private_ngo.length} record(s)`);
  console.log();
}

run();
