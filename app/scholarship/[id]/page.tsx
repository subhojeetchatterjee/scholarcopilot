import Link from "next/link";
import type { Scholarship } from "@/types";
import DeadlineBadge from "@/components/DeadlineBadge";
import VerificationBadge from "@/components/VerificationBadge";
import MatchSection from "./MatchSection";
import rawScholarships from "@/data/scholarships.json";

const scholarships = rawScholarships as unknown as Scholarship[];

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtIncome(n: number): string {
  return n >= 100_000
    ? `₹${(n / 100_000).toFixed(1)} Lakh per year`
    : `₹${n.toLocaleString("en-IN")} per year`;
}

function fmtList(arr: string[], allLabel: string): string {
  return arr.includes("ALL") ? allLabel : arr.join(", ");
}

const SOURCE_LABELS: Record<string, string> = {
  government: "Government",
  ngo: "NGO / Non-Profit",
  private: "Private / Corporate",
  institution: "Educational Institution",
};

const SOURCE_PILLS: Record<string, string> = {
  government: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  ngo:        "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/60",
  private:    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  institution:"bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
};

// ── Small layout helpers ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EligRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-400 dark:text-slate-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

// ── Not-found state ───────────────────────────────────────────────────────────

function NotFound({ id }: { id: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <nav className="bg-white/85 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/matches" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">← Matches</Link>
          <Link href="/" className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Scholar<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
          </Link>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-4" aria-hidden>🔍</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Scholarship not found</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          No scholarship with ID{" "}
          <code className="bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs">{id}</code>{" "}
          exists in the dataset.
        </p>
        <Link href="/matches" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm">
          ← Back to your matches
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScholarshipDetailPage({ params }: Props) {
  const { id } = await params;

  const sc = scholarships.find((s) => s.id === id);
  if (!sc) return <NotFound id={id} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Nav */}
      <nav className="bg-white/85 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/matches" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            ← Matches
          </Link>
          <Link href="/" className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-lg">
            Scholar<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SOURCE_PILLS[sc.source_type] ?? "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}`}
            >
              {SOURCE_LABELS[sc.source_type] ?? sc.source_type}
            </span>
            <DeadlineBadge deadline={sc.deadline} />
            <VerificationBadge status={sc.verification_status} size="sm" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1">
            {sc.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{sc.provider}</p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            {sc.verification_status === "verified"
              ? "Eligibility details manually confirmed against the official source."
              : sc.verification_status === "needs_review"
              ? "Official source identified; manual verification pending."
              : "Based on official scheme information; confirm current details on the official page."}
          </p>

          <a
            href={sc.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 px-4 py-2 rounded-xl transition-colors"
          >
            Visit Official Page
            <span aria-hidden>↗</span>
          </a>
        </div>

        {/* ── Summary ───────────────────────────────────────────────────────── */}
        <Section title="About this scholarship">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sc.summary}</p>
        </Section>

        {/* ── Eligibility criteria ──────────────────────────────────────────── */}
        <Section title="Eligibility criteria">
          <div>
            <EligRow
              label="Open to"
              value={fmtList(sc.states_allowed, "All Indian states")}
            />
            <EligRow
              label="Courses"
              value={sc.course_levels.join(", ")}
            />
            <EligRow
              label="Category"
              value={fmtList(sc.category_allowed, "Open to all categories")}
            />
            <EligRow
              label="Gender"
              value={fmtList(sc.gender_allowed, "Open to all genders")}
            />
            {sc.min_marks !== null && (
              <EligRow label="Min. marks" value={`${sc.min_marks}% or above`} />
            )}
            {sc.income_limit !== null && (
              <EligRow label="Income limit" value={fmtIncome(sc.income_limit)} />
            )}
            {sc.disability_requirement !== "not_applicable" && (
              <EligRow
                label="Disability"
                value={
                  sc.disability_requirement === "required"
                    ? "Must have a benchmark disability certificate (40%+)"
                    : "Additional provisions available for students with disabilities"
                }
              />
            )}
            <EligRow
              label="Deadline"
              value={new Date(sc.deadline).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          </div>
        </Section>

        {/* ── Documents checklist ───────────────────────────────────────────── */}
        <Section title="Required documents">
          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
            {sc.docs_required.map((doc) => (
              <li key={doc} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" aria-hidden />
                <span className="text-sm text-slate-700 dark:text-slate-300">{doc}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            Gather these documents before applying. Requirements may vary — always verify on the official page.
          </p>
        </Section>

        {/* ── Match context + AI actions (client) ───────────────────────────── */}
        <MatchSection id={id} />

        {/* ── Transparency ──────────────────────────────────────────────────── */}
        <section
          className={[
            "rounded-2xl border p-6",
            sc.verification_status === "verified"
              ? "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30"
              : "bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30",
          ].join(" ")}
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Transparency &amp; data notes
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">

            {/* Verification provenance */}
            {sc.verification_status === "verified" ? (
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Source verified: </span>
                Eligibility criteria for this record were manually confirmed against the official source.
                {sc.source_name && (
                  <> Source: <span className="font-medium text-slate-700 dark:text-slate-300">{sc.source_name}</span>.</>
                )}
                {sc.last_verified_at && (
                  <> Last checked:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(sc.last_verified_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </span>.
                  </>
                )}
                {sc.source_url && (
                  <> <a href={sc.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 ml-0.5">View source ↗</a></>
                )}
              </p>
            ) : sc.verification_status === "needs_review" ? (
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Pending verification: </span>
                This record is sourced from an official portal but has not yet been manually spot-checked.
                {sc.source_name && (
                  <> Data sourced from: <span className="font-medium text-slate-700 dark:text-slate-300">{sc.source_name}</span>.</>
                )}
              </p>
            ) : (
              <p>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Under review: </span>
                This record is based on official scholarship scheme information but has not yet been manually verified against the source. Eligibility criteria, deadlines, and income limits may have changed. Confirm current details on the official scholarship page before applying.
              </p>
            )}

            {/* Verification note if present */}
            {sc.verification_note && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-slate-300">Reviewer notes: </span>
                {sc.verification_note}
              </p>
            )}

            {/* Source note — only shown for verified/needs_review records where it carries meaningful provenance */}
            {sc.source_note && sc.verification_status !== "mock" && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-slate-300">Source note: </span>
                {sc.source_note}
              </p>
            )}

            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-300">Guidance only: </span>
              This result is not an official eligibility decision. Rules may have
              changed — always verify on the official scholarship page before applying.
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-300">Your data: </span>
              ScholarCopilot only uses the information you provided. Nothing
              is inferred or guessed. Missing fields are shown as uncertain.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
