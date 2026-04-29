import type { VerificationStatus } from "@/types";

interface Props {
  status?: VerificationStatus;
  size?: "sm" | "xs";
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.5 3.5 6.5-7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7v5M8 5v.5" />
    </svg>
  );
}

const VARIANTS: Record<
  VerificationStatus,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  verified: {
    label: "Source verified",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
    icon: <CheckIcon />,
  },
  needs_review: {
    label: "Pending verification",
    cls: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-700/50",
    icon: <ClockIcon />,
  },
  mock: {
    label: "Under review",
    cls: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-500 dark:border-amber-800/40",
    icon: <InfoIcon />,
  },
};

export default function VerificationBadge({ status, size = "xs" }: Props) {
  const variant = VARIANTS[status ?? "mock"];
  const textSize = size === "sm" ? "text-xs" : "text-[10px]";
  const padding  = size === "sm" ? "px-2.5 py-1" : "px-2 py-0.5";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border font-medium",
        textSize,
        padding,
        variant.cls,
      ].join(" ")}
    >
      {variant.icon}
      {variant.label}
    </span>
  );
}
