"use client";

interface Props {
  value: "en" | "hi" | "bn";
  onChange: (lang: "en" | "hi" | "bn") => void;
}

const options: { value: "en" | "hi" | "bn"; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "bn", label: "বাংলা" },
];

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-[150ms]",
            value === opt.value
              ? "bg-white shadow-sm text-slate-800 dark:bg-white/15 dark:text-slate-200"
              : "text-slate-400 hover:text-slate-700 hover:-translate-y-px dark:text-slate-500 dark:hover:text-slate-300",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
