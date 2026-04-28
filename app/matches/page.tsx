"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StudentProfile, MatchResult, Scholarship, MatchStatus } from "@/types";
import ScholarshipCard from "@/components/ScholarshipCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Pair = { result: MatchResult; scholarship: Scholarship };

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; pairs: Pair[]; profile: StudentProfile };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_ORDER: MatchStatus[] = [
  "eligible",
  "maybe_eligible",
  "insufficient_data",
  "not_eligible",
];

const GROUP_META: Record<
  MatchStatus,
  { label: string; desc: string; pill: string }
> = {
  eligible: {
    label: "Eligible",
    desc: "You meet all known criteria for these scholarships.",
    pill: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  maybe_eligible: {
    label: "Maybe Eligible",
    desc: "Some criteria are uncertain — verify details directly on each page.",
    pill: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
  },
  insufficient_data: {
    label: "Insufficient Data",
    desc: "Your profile is missing fields needed to fully evaluate these. Consider updating your profile.",
    pill: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  not_eligible: {
    label: "Not Eligible",
    desc: "You don't meet the stated criteria. Shown for transparency.",
    pill: "bg-red-50 text-red-600 border-red-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
  },
};

const INCOME_LABELS: Record<string, string> = {
  below_1L:    "< ₹1L",
  "1L_to_2.5L": "₹1L–2.5L",
  "2.5L_to_5L": "₹2.5L–5L",
  "5L_to_8L":  "₹5L–8L",
  above_8L:    "> ₹8L",
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="bg-white/85 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-lg">
          Scholar<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
        </Link>
        <Link href="/profile" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
          ← Edit profile
        </Link>
      </div>
    </nav>
  );
}

function ProfileStrip({ profile }: { profile: StudentProfile }) {
  const items = [
    { label: "State",    value: profile.state },
    { label: "Course",   value: profile.class_or_degree },
    { label: "Category", value: profile.category },
    { label: "Income",   value: INCOME_LABELS[profile.annual_family_income_range] ?? profile.annual_family_income_range },
    { label: "Score",    value: `${profile.normalized_percentage.toFixed(1)}%` },
  ];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 px-5 py-4 mb-8 flex flex-wrap gap-x-6 gap-y-3 items-center">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      ))}
    </div>
  );
}

function GroupHeader({ status, count }: { status: MatchStatus; count: number }) {
  const meta = GROUP_META[status];
  return (
    <div className="mb-4 mt-8 first:mt-0">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${meta.pill} whitespace-nowrap`}>
          {meta.label} · {count}
        </span>
        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{meta.desc}</p>
    </div>
  );
}

function Spinner({ label = "Finding your scholarships…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-500 animate-spin" />
      <p className="text-slate-400 dark:text-slate-500 text-sm">{label}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-24">
      <p className="text-3xl mb-3" aria-hidden>⚠️</p>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <p className="text-4xl mb-4" aria-hidden>🔍</p>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No strong matches found</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        The curated demo dataset may not have scholarships that match all your
        current criteria. Try updating your profile or broadening your eligibility details.
      </p>
      <Link
        href="/profile"
        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors inline-block"
      >
        Update profile →
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [showIneligible, setShowIneligible] = useState(false);

  const runMatch = useCallback(async (profile: StudentProfile) => {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setState({ phase: "error", message: json.message ?? "Failed to load matches. Please try again." });
        return;
      }
      const json = await res.json();
      // Persist full response so /scholarship/[id] can read without re-fetching
      sessionStorage.setItem("sc_match_response", JSON.stringify(json));
      // Zip results + scholarships by index (backend guarantees alignment)
      const pairs: Pair[] = (json.results as MatchResult[]).map(
        (result, i) => ({ result, scholarship: json.scholarships[i] as Scholarship })
      );
      setState({ phase: "done", pairs, profile });
    } catch {
      setState({ phase: "error", message: "Network error — check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("sc_profile");
    if (!raw) { router.replace("/profile"); return; }

    let profile: StudentProfile;
    try { profile = JSON.parse(raw); } catch { router.replace("/profile"); return; }

    runMatch(profile);
  }, [router, runMatch]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4">
          <Spinner />
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    const profile = (() => {
      try { return JSON.parse(sessionStorage.getItem("sc_profile") ?? "") as StudentProfile; }
      catch { return null; }
    })();
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4">
          <ErrorState
            message={state.message}
            onRetry={() => profile && runMatch(profile)}
          />
        </div>
      </div>
    );
  }

  const { pairs, profile } = state;

  // Group pairs by status, preserving backend score order within each group
  const grouped = STATUS_ORDER.reduce<Record<MatchStatus, Pair[]>>(
    (acc, s) => ({ ...acc, [s]: pairs.filter((p) => p.result.status === s) }),
    {} as Record<MatchStatus, Pair[]>
  );

  const usefulCount =
    grouped.eligible.length + grouped.maybe_eligible.length;
  const totalChecked = pairs.length;

  // Show empty state if nothing useful was found
  const hasUseful = usefulCount > 0 || grouped.insufficient_data.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Your scholarship matches
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {usefulCount > 0
              ? `${usefulCount} strong match${usefulCount === 1 ? "" : "es"} found · ${totalChecked} scholarships checked`
              : `${totalChecked} scholarships checked · no strong matches yet`}
            &nbsp;· Results are guidance only.
          </p>
        </div>

        {/* Profile summary strip */}
        <ProfileStrip profile={profile} />

        {/* Results */}
        {!hasUseful ? (
          <EmptyState />
        ) : (
          <>
            {/* Eligible */}
            {grouped.eligible.length > 0 && (
              <section>
                <GroupHeader status="eligible" count={grouped.eligible.length} />
                <div className="space-y-4">
                  {grouped.eligible.map((p) => (
                    <ScholarshipCard
                      key={p.result.scholarship_id}
                      scholarship={p.scholarship}
                      result={p.result}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Maybe eligible */}
            {grouped.maybe_eligible.length > 0 && (
              <section>
                <GroupHeader status="maybe_eligible" count={grouped.maybe_eligible.length} />
                <div className="space-y-4">
                  {grouped.maybe_eligible.map((p) => (
                    <ScholarshipCard
                      key={p.result.scholarship_id}
                      scholarship={p.scholarship}
                      result={p.result}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Insufficient data */}
            {grouped.insufficient_data.length > 0 && (
              <section>
                <GroupHeader status="insufficient_data" count={grouped.insufficient_data.length} />
                <div className="space-y-4">
                  {grouped.insufficient_data.map((p) => (
                    <ScholarshipCard
                      key={p.result.scholarship_id}
                      scholarship={p.scholarship}
                      result={p.result}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Not eligible — collapsed by default */}
            {grouped.not_eligible.length > 0 && (
              <section className="mt-10">
                <button
                  onClick={() => setShowIneligible((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                >
                  <span>
                    {showIneligible
                      ? `Hide ${grouped.not_eligible.length} not-eligible scholarships`
                      : `Show ${grouped.not_eligible.length} scholarships you don't qualify for`}
                  </span>
                  <span aria-hidden>{showIneligible ? "↑" : "↓"}</span>
                </button>

                {showIneligible && (
                  <div className="mt-4">
                    <GroupHeader status="not_eligible" count={grouped.not_eligible.length} />
                    <div className="space-y-4">
                      {grouped.not_eligible.map((p) => (
                        <ScholarshipCard
                          key={p.result.scholarship_id}
                          scholarship={p.scholarship}
                          result={p.result}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Ethics note */}
        <p className="mt-12 text-xs text-slate-400 dark:text-slate-500 text-center leading-relaxed">
          Results are guidance only, not official eligibility decisions.
          Always verify on each scholarship&apos;s official page before applying.
          Dataset is a curated hackathon demo — not live data.
        </p>
      </div>
    </div>
  );
}
