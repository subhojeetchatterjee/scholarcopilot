import type { MatchStatus } from "@/types";

interface Props {
  status: MatchStatus;
}

const config: Record<MatchStatus, { label: string; dot: string; badge: string }> = {
  eligible: {
    label: "Eligible",
    dot: "#22c55e",
    badge: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  maybe_eligible: {
    label: "Maybe Eligible",
    dot: "#f59e0b",
    badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  insufficient_data: {
    label: "Insufficient Data",
    dot: "#facc15",
    badge: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
  },
  not_eligible: {
    label: "Not Eligible",
    dot: "#fb7185",
    badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
  },
};

export default function MatchBadge({ status }: Props) {
  const { label, dot, badge } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide border ${badge}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: dot }}
        aria-hidden
      />
      {label}
    </span>
  );
}
