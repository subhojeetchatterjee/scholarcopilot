"use client";

import { useState } from "react";
import Link from "next/link";
import type { Scholarship, MatchResult, MatchStatus } from "@/types";
import VerificationBadge from "@/components/VerificationBadge";

interface Props {
  scholarship: Scholarship;
  result: MatchResult;
}

// ── Status styling ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  MatchStatus,
  { label: string; dot: string; fill: string; glow: string; badge: string; track: string }
> = {
  eligible: {
    label: "Eligible",
    dot: "#22c55e",
    fill: "#22c55e",
    glow: "rgba(34,197,94,0.45)",
    badge:
      "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    track: "bg-green-100 dark:bg-green-950",
  },
  maybe_eligible: {
    label: "Maybe Eligible",
    dot: "#f59e0b",
    fill: "#f59e0b",
    glow: "rgba(245,158,11,0.45)",
    badge:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    track: "bg-amber-100 dark:bg-amber-950",
  },
  insufficient_data: {
    label: "Insufficient Data",
    dot: "#facc15",
    fill: "#facc15",
    glow: "rgba(250,204,21,0.45)",
    badge:
      "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
    track: "bg-yellow-100 dark:bg-yellow-950",
  },
  not_eligible: {
    label: "Not Eligible",
    dot: "#fb7185",
    fill: "#fb7185",
    glow: "rgba(251,113,133,0.45)",
    badge:
      "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
    track: "bg-rose-100 dark:bg-rose-950",
  },
};

// ── Tiny inline SVG icons ──────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="13" height="11.5" rx="2"/>
      <path d="M1.5 7h13M5.5 1.5v3M10.5 1.5v3"/>
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 4.5v7M6 6.25C6 5.56 6.9 5 8 5s2 .56 2 1.25S9.1 7.5 8 7.5 6 8.06 6 8.75 6.9 10 8 10s2-.56 2-1.25"/>
    </svg>
  );
}

function BldgIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="8" height="12.5" rx="1"/>
      <path d="M9.5 5.5h5v9h-5"/>
      <path d="M4 5h2M4 8h2M4 11h2M11 8h1M11 11h1"/>
    </svg>
  );
}

// ── Data helpers ───────────────────────────────────────────────────────────────

function deadlineChipLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
  if (d < 0)   return "Closed";
  if (d === 0) return "Due today";
  if (d <= 30) return `${d}d left`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function incomeChipLabel(limit: number | null): string {
  if (limit === null) return "No income limit";
  const l = limit >= 100_000 ? `₹${(limit / 100_000).toFixed(1)}L` : `₹${limit.toLocaleString("en-IN")}`;
  return `Income ≤ ${l}`;
}

function deriveTags(sc: Scholarship): string[] {
  const tags: string[] = [];
  const srcLabel: Record<string, string> = {
    government: "Government", ngo: "NGO", private: "Private", institution: "Institution",
  };
  if (srcLabel[sc.source_type]) tags.push(srcLabel[sc.source_type]);
  sc.course_levels.slice(0, 2).forEach((l) => tags.push(l));
  if (!sc.gender_allowed.includes("ALL") && sc.gender_allowed.length === 1) {
    tags.push(`${sc.gender_allowed[0]} only`);
  }
  if (sc.disability_requirement === "required")  tags.push("PwD required");
  if (sc.disability_requirement === "preferred") tags.push("PwD preferred");
  if (!sc.category_allowed.includes("ALL")) {
    sc.category_allowed.slice(0, 2).forEach((c) => tags.push(c));
  }
  return tags.slice(0, 5);
}

// ── Card ───────────────────────────────────────────────────────────────────────

export default function ScholarshipCard({ scholarship, result }: Props) {
  const [hovered, setHovered] = useState(false);
  const [ctaHov, setCtaHov]   = useState(false);

  const cfg   = STATUS_CFG[result.status];
  const score = Math.max(0, Math.min(100, result.score));
  const tags  = deriveTags(scholarship);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "relative overflow-hidden flex flex-col gap-3.5 rounded-[18px] p-5",
        "bg-white border",
        "dark:bg-[#131929]",
        "transition-[transform,box-shadow,border-color] duration-[220ms]",
        hovered
          ? "shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.07)] -translate-y-[3px] border-slate-300 dark:border-slate-600"
          : "shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.05)] translate-y-0 border-slate-200 dark:border-[#1e2d45]",
      ].join(" ")}
    >
      {/* Shimmer accent line sweeps in on hover */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.6) 50%, transparent 100%)",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: hovered
            ? "opacity 0.05s, transform 0.45s cubic-bezier(.4,0,.2,1)"
            : "opacity 0.3s, transform 0s",
        }}
      />

      {/* ── Top row: badge + score meter + CTA ────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2.5">

        {/* Left: status badge + score meter */}
        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide border ${cfg.badge}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: cfg.dot }}
            />
            {cfg.label}
          </span>

          {/* Score meter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              Match
            </span>
            <div
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`w-[70px] h-[5px] rounded-full overflow-hidden ${cfg.track}`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  background: cfg.fill,
                  boxShadow: hovered ? `0 0 7px ${cfg.glow}` : "none",
                  transition: "width 0.7s cubic-bezier(.4,0,.2,1), box-shadow 0.3s ease",
                }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {score}
              <span className="text-[10px] text-slate-400 dark:text-slate-600">%</span>
            </span>
          </div>
        </div>

        {/* CTA — preserves existing routing */}
        <Link
          href={`/scholarship/${scholarship.id}`}
          onMouseEnter={() => setCtaHov(true)}
          onMouseLeave={() => setCtaHov(false)}
          className={[
            "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold border",
            "transition-all duration-[180ms]",
            ctaHov
              ? "bg-slate-900 border-slate-900 text-white -translate-y-px shadow-[0_4px_12px_rgba(0,0,0,0.18)] dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900"
              : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-[#0f1a2e] dark:border-[#1e2d45] dark:text-slate-400",
          ].join(" ")}
        >
          View details
          <svg
            width="11" height="11" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: ctaHov ? "translateX(3px)" : "translateX(0)",
              transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            <path d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
        </Link>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="h-px bg-slate-100 dark:bg-[#1a2540] -mx-1" />

      {/* ── Title + provider ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          {scholarship.name}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-500">
          <BldgIcon /> {scholarship.provider}
        </span>
      </div>

      {/* ── Meta chips: deadline + income ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-slate-200 bg-slate-50 text-slate-600 dark:border-[#1e2d45] dark:bg-[#0f1a2e] dark:text-slate-400">
          <CalIcon /> {deadlineChipLabel(scholarship.deadline)}
        </span>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border",
            "border-slate-200 bg-slate-50 dark:border-[#1e2d45] dark:bg-[#0f1a2e]",
            scholarship.income_limit === null
              ? "text-slate-400 dark:text-slate-600"
              : "text-slate-600 dark:text-slate-400",
          ].join(" ")}
        >
          <CoinIcon /> {incomeChipLabel(scholarship.income_limit)}
        </span>
      </div>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-500 line-clamp-3 m-0">
        {scholarship.summary}
      </p>

      {/* ── Tags ───────────────────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={[
                "inline-flex items-center rounded-[7px] px-2.5 py-1 text-[11px] font-medium border",
                "transition-colors duration-200",
                hovered
                  ? "bg-slate-100 border-slate-300 text-slate-500 dark:bg-[#1a2a44] dark:border-[#253654] dark:text-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#0f1a2e] dark:border-[#1e2d45] dark:text-slate-600",
              ].join(" ")}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Verification status ─────────────────────────────────────────────── */}
      <div>
        <VerificationBadge status={scholarship.verification_status} />
      </div>
    </article>
  );
}
