"use client";

import type { ReactNode } from "react";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  variant: "explain" | "draft";
  languageSelector: ReactNode;
  translating?: boolean;
  translateError?: string;
  footerNote?: string;
  className?: string;
}

// ── Variant config ─────────────────────────────────────────────────────────────

const VCFG = {
  explain: {
    label: "AI Explanation",
    topGrad:
      "linear-gradient(90deg,#4f46e5 0%,#818cf8 40%,#6366f1 70%,#4f46e5 100%)",
    badgeCls:
      "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
    dot: "#6366f1",
    cardCls:
      "bg-[#fafbff] border-indigo-100 dark:bg-[#0d0c1a] dark:border-indigo-900",
    liDot: "#6366f1",
    callout: {
      wrapCls:   "bg-[#f0edff] dark:bg-indigo-900/20",
      borderColor: "#818cf8",
      textCls:   "text-[#3730a3] dark:text-indigo-300",
      arrowCls:  "text-[#6366f1] dark:text-indigo-400",
    },
  },
  draft: {
    label: "Draft Answer",
    topGrad:
      "linear-gradient(90deg,#7c3aed 0%,#c084fc 40%,#8b5cf6 70%,#7c3aed 100%)",
    badgeCls:
      "bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    dot: "#8b5cf6",
    cardCls:
      "bg-[#fdfaff] border-purple-100 dark:bg-[#0d0c1a] dark:border-purple-900",
    liDot: "#8b5cf6",
    callout: {
      wrapCls:   "bg-[#f5f3ff] dark:bg-purple-900/20",
      borderColor: "#a78bfa",
      textCls:   "text-[#5b21b6] dark:text-purple-300",
      arrowCls:  "text-[#8b5cf6] dark:text-purple-400",
    },
  },
} as const;

type VCfg = (typeof VCFG)[keyof typeof VCFG];

// ── Inline parser ──────────────────────────────────────────────────────────────

type InlineNode = { k: "t" | "b" | "i" | "c"; v: string };

function parseInlines(text: string): InlineNode[] {
  const parts: InlineNode[] = [];
  const re = /(\*\*(.+?)\*\*|_(.+?)_|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ k: "t", v: text.slice(last, m.index) });
    if      (m[2] !== undefined) parts.push({ k: "b", v: m[2] });
    else if (m[3] !== undefined) parts.push({ k: "i", v: m[3] });
    else if (m[4] !== undefined) parts.push({ k: "c", v: m[4] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ k: "t", v: text.slice(last) });
  return parts;
}

// ── Block parser ───────────────────────────────────────────────────────────────

type Block =
  | { type: "blank" }
  | { type: "rule" }
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; nodes: InlineNode[] }
  | { type: "ul"; items: InlineNode[][] }
  | { type: "call"; nodes: InlineNode[] };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === "---")   { blocks.push({ type: "rule" });                         i++; continue; }
    if (l.startsWith("# "))  { blocks.push({ type: "h1",   text: l.slice(2).trim() }); i++; continue; }
    if (l.startsWith("## ")) { blocks.push({ type: "h2",   text: l.slice(3).trim() }); i++; continue; }
    if (l.startsWith("> "))  { blocks.push({ type: "call", nodes: parseInlines(l.slice(2).trim()) }); i++; continue; }
    if (l.startsWith("- ") || l.startsWith("* ")) {
      const items: InlineNode[][] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(parseInlines(lines[i].slice(2).trim()));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (l.trim() === "") { blocks.push({ type: "blank" }); i++; continue; }
    // Merge consecutive plain-text lines into one paragraph (handles line-wrapped output).
    const pNodes = parseInlines(l.trim());
    const prev = blocks[blocks.length - 1];
    if (prev?.type === "p") {
      (prev as { type: "p"; nodes: InlineNode[] }).nodes.push({ k: "t", v: " " }, ...pNodes);
    } else {
      blocks.push({ type: "p", nodes: pNodes });
    }
    i++;
  }
  return blocks;
}

// ── Inline renderer ────────────────────────────────────────────────────────────

function Inlines({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.k === "b")
          return (
            <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">
              {n.v}
            </strong>
          );
        if (n.k === "i")
          return (
            <em key={i} className="italic text-slate-500 dark:text-slate-400">
              {n.v}
            </em>
          );
        if (n.k === "c")
          return (
            <code
              key={i}
              className="text-[0.82em] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/10 dark:text-slate-300"
            >
              {n.v}
            </code>
          );
        return <span key={i}>{n.v}</span>;
      })}
    </>
  );
}

// ── Block renderer ─────────────────────────────────────────────────────────────

function Blocks({ blocks, cfg }: { blocks: Block[]; cfg: VCfg }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "blank":
            return <div key={i} className="h-3" />;

          case "rule":
            return (
              <hr
                key={i}
                className="border-0 border-t border-slate-200 dark:border-white/10 my-5"
              />
            );

          case "h1":
            return (
              <h3
                key={i}
                className="text-base font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100 mt-5 mb-2 first:mt-0"
              >
                {b.text}
              </h3>
            );

          case "h2":
            return (
              <p
                key={i}
                className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 pb-2 border-b border-slate-200 dark:border-white/10 mt-5 mb-3 first:mt-0"
              >
                {b.text}
              </p>
            );

          case "p":
            return (
              <p
                key={i}
                className="text-sm leading-[1.85] text-slate-600 dark:text-slate-400 mb-0.5"
              >
                <Inlines nodes={b.nodes} />
              </p>
            );

          case "ul":
            return (
              <ul key={i} className="list-none p-0 my-3 flex flex-col gap-2">
                {b.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 text-sm leading-[1.8] text-slate-600 dark:text-slate-400 hover:translate-x-1 transition-transform duration-150 cursor-default"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.62em]"
                      style={{ background: cfg.liDot }}
                    />
                    <span>
                      <Inlines nodes={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );

          case "call":
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-xl py-3 px-4 my-4 hover:translate-x-1 transition-transform duration-[220ms] cursor-default ${cfg.callout.wrapCls}`}
                style={{ borderLeft: `3px solid ${cfg.callout.borderColor}` }}
              >
                <span className={`text-[11px] font-bold flex-shrink-0 mt-0.5 ${cfg.callout.arrowCls}`}>
                  ↳
                </span>
                <p className={`text-[13px] leading-relaxed ${cfg.callout.textCls}`}>
                  <Inlines nodes={b.nodes} />
                </p>
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}

// ── Pencil icon ────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5 text-slate-300 dark:text-slate-600"
      aria-hidden
    >
      <path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z" />
      <path d="M9.5 4.5l2 2" />
    </svg>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export default function AIAnswerPanel({
  content,
  variant,
  languageSelector,
  translating = false,
  translateError,
  footerNote,
  className = "",
}: Props) {
  const cfg = VCFG[variant];
  const blocks = parseContent(content);

  const defaultFooter =
    variant === "draft"
      ? "This is a starting draft — edit it in your own words before submitting."
      : "AI-generated explanation based on your profile and the scholarship criteria.";
  const note = footerNote ?? defaultFooter;

  return (
    <article
      className={[
        "overflow-hidden rounded-[18px] border flex flex-col",
        cfg.cardCls,
        className,
      ].join(" ")}
    >
      {/* Shimmer top accent bar */}
      <div
        aria-hidden
        className="h-[3px] w-full flex-shrink-0"
        style={{
          background: cfg.topGrad,
          backgroundSize: "200% auto",
          animation: "sc-shimmer 5s linear infinite",
        }}
      />

      {/* Header: badge + language selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold tracking-wide uppercase ${cfg.badgeCls}`}
        >
          <span
            className="w-[5px] h-[5px] rounded-full flex-shrink-0"
            style={{ background: cfg.dot }}
          />
          {cfg.label}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {languageSelector}
          {translating && (
            <span className="text-xs text-slate-400">Translating…</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-white/10 mx-5" />

      {/* Content — fades in when panel appears */}
      <div className="px-5 py-4 flex-1 sc-fade-up" role="tabpanel">
        <Blocks blocks={blocks} cfg={cfg} />
      </div>

      {/* Footer */}
      <div className="flex items-start gap-2 border-t border-slate-100 dark:border-white/10 px-5 py-3">
        <PencilIcon />
        <div>
          {translateError && (
            <p className="text-xs text-red-600 mb-1">{translateError}</p>
          )}
          <p className="text-xs italic leading-relaxed text-slate-400 dark:text-slate-600">
            {note}
          </p>
        </div>
      </div>
    </article>
  );
}
