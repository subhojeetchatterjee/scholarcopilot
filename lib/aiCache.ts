import type { StudentProfile } from "@/types";

const TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export function getCached(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function setCached(key: string, value: string): void {
  try {
    const entry: CacheEntry = { value, expiresAt: Date.now() + TTL_MS };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage may be full or unavailable — silently skip
  }
}

// Stable fingerprint from every field that appears in AI prompts.
// Changes if the student updates their profile, invalidating all cached outputs.
export function profileFingerprint(p: StudentProfile): string {
  return [
    p.full_name,
    p.age,
    p.state,
    p.class_or_degree,
    p.institution_type,
    p.annual_family_income_range,
    p.category,
    p.gender,
    p.disability_status ? "1" : "0",
    p.normalized_percentage,
    p.preferred_language,
    p.career_goal,
  ].join("|");
}
