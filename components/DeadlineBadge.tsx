interface Props {
  deadline: string; // ISO date YYYY-MM-DD
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DeadlineBadge({ deadline }: Props) {
  const days = daysUntil(deadline);

  let className = "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
  let label = `${days}d left`;

  if (days < 0) {
    className = "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500";
    label = "Closed";
  } else if (days <= 7) {
    className = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
    label = `${days}d left`;
  } else if (days <= 30) {
    className = "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400";
    label = `${days}d left`;
  }

  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${className}`}
    >
      {label}
    </span>
  );
}
