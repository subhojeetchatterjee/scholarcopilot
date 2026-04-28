import Link from "next/link";

// ── Inline SVG checkmark (used in Trust section) ──────────────────────────────
function CheckIcon() {
  return (
    <svg
      className="w-3 h-3 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PAINS = [
  {
    icon: "🗂️",
    title: "Scholarships are scattered",
    body: "Government, NGO, and private scholarships live on hundreds of different portals. Students have no single place to start.",
  },
  {
    icon: "🤷",
    title: "Eligibility is genuinely confusing",
    body: "Income limits, category codes, state domicile rules, minimum marks — understanding all the criteria takes hours of research.",
  },
  {
    icon: "⏰",
    title: "Deadlines get missed",
    body: "Without a unified view of upcoming deadlines and required documents, students miss scholarships they were fully eligible for.",
  },
] as const;

const STEPS = [
  {
    title: "Tell us about yourself",
    body: "Fill a two-minute profile — state, class or degree, income range, category, and your marks or CGPA.",
  },
  {
    title: "Get matched instantly",
    body: "Our rule-based engine checks every scholarship against your exact profile. No AI guessing — deterministic eligibility logic.",
  },
  {
    title: "Understand why you matched",
    body: "Claude explains each result in plain language — which criteria matched, what's missing, and what to verify on the official page.",
  },
  {
    title: "Prepare your application",
    body: "Get a per-scholarship document checklist, then use Claude to draft application answers from only the facts you provided.",
  },
] as const;

const FEATURES = [
  {
    icon: "⚡",
    title: "Rule-Based Matching",
    body: "Deterministic checks across state, category, income, marks, gender, and course level. Scored, ranked, fully transparent.",
    bg: "bg-yellow-50 border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900/30",
  },
  {
    icon: "🌐",
    title: "Multilingual Support",
    body: "Read match explanations in English, Hindi, or Bengali — whichever you are most comfortable with.",
    bg: "bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30",
  },
  {
    icon: "📅",
    title: "Deadline Tracking",
    body: "Colour-coded urgency badges on every card. See exactly how many days you have left before the deadline closes.",
    bg: "bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30",
  },
  {
    icon: "📋",
    title: "Document Checklist",
    body: "Every scholarship lists exactly which documents to gather — Aadhaar, income certificate, caste certificate, and more.",
    bg: "bg-purple-50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30",
  },
  {
    icon: "🤖",
    title: "AI Match Explanation",
    body: "Claude reads your profile and the scholarship rules, then explains your result in a single clear paragraph.",
    bg: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30",
  },
  {
    icon: "✍️",
    title: "Application Drafting",
    body: "Paste the application question and Claude drafts a response using only facts you provided — nothing fabricated.",
    bg: "bg-pink-50 border-pink-100 dark:bg-pink-950/20 dark:border-pink-900/30",
  },
] as const;

const TRUST = [
  {
    title: "Guidance, not guarantees",
    body: "Results help you discover and explore options — they are not official eligibility decisions. Always verify on the official scholarship page before applying.",
  },
  {
    title: "Only your data, always",
    body: 'ScholarCopilot uses only the information you provide. Missing fields are shown as "insufficient data" — never inferred or guessed.',
  },
  {
    title: "Curated demo dataset",
    body: "This is a hackathon demo with a curated mock dataset based on typical public scholarship criteria. It is not live or scraped data.",
  },
] as const;

// ── Sections ──────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/85 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight">
          Scholar<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
        </span>
        <Link
          href="/profile"
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-[180ms] hover:-translate-y-px hover:shadow-md"
        >
          Find My Scholarships →
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="min-h-screen flex items-center bg-gradient-to-br from-slate-50 via-indigo-50/60 to-white dark:from-slate-950 dark:via-indigo-950/30 dark:to-slate-900 pt-16">
      <div className="max-w-5xl mx-auto px-4 py-28 text-center">
        {/* Badge */}
        <div className="sc-reveal sc-reveal-1 inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-indigo-200/60 dark:border-indigo-800/40">
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse" />
          Funding Your Education, Intelligently
        </div>

        {/* Headline */}
        <h1 className="sc-reveal sc-reveal-2 text-5xl sm:text-6xl font-bold text-slate-900 dark:text-slate-50 leading-[1.1] tracking-tight mb-6">
          Find scholarships<br />
          <span className="text-indigo-600 dark:text-indigo-400">you actually qualify for</span>
        </h1>

        {/* Subheadline */}
        <p className="sc-reveal sc-reveal-3 text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          ScholarCopilot matches Indian students in Class 11, 12, and undergrad
          with the right scholarships — using rule-based eligibility, not guesswork.
          Then Claude explains why and helps you apply faster.
        </p>

        {/* CTAs */}
        <div className="sc-reveal sc-reveal-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-[180ms] shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
          >
            Find My Scholarships
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-[180ms] hover:-translate-y-0.5"
          >
            See How It Works
          </a>
        </div>

        {/* Trust strip */}
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          No login required &nbsp;·&nbsp; Free to use &nbsp;·&nbsp; Results in under 10 seconds
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section id="how-it-works" className="bg-white dark:bg-slate-950 py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-widest uppercase text-center mb-3">
          The Problem
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4 tracking-tight">
          Finding the right scholarship<br className="hidden md:block" /> is harder than it should be
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg text-center max-w-xl mx-auto mb-14">
          Three compounding problems stop Indian students from getting scholarships they deserve.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {PAINS.map((p) => (
            <div
              key={p.title}
              className="p-7 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 hover:-translate-y-1 transition-transform duration-200"
            >
              <span className="text-4xl block mb-5" aria-hidden>{p.icon}</span>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-2">{p.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900 py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-widest uppercase text-center mb-3">
          How It Works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 text-center mb-16 tracking-tight">
          From profile to application in four steps
        </h2>
        <div className="grid md:grid-cols-2 gap-10">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-5">
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-md">
                {i + 1}
              </div>
              <div className="pt-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-white dark:bg-slate-950 py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-widest uppercase text-center mb-3">
          Features
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 text-center mb-4 tracking-tight">
          Everything you need, nothing you don&apos;t
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg text-center max-w-xl mx-auto mb-14">
          Designed for a hackathon timeline — built to solve a real problem for real students.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`p-6 rounded-2xl border ${f.bg} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
            >
              <span className="text-3xl block mb-4" aria-hidden>{f.icon}</span>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-amber-50 dark:bg-amber-950/10 border-y border-amber-100 dark:border-amber-900/20 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-12 tracking-tight">
          Built with transparency
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {TRUST.map((t) => (
            <div key={t.title} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                <CheckIcon />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">{t.title}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFooter() {
  return (
    <section className="bg-indigo-600 dark:bg-indigo-900 py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
          Ready to find your scholarships?
        </h2>
        <p className="text-indigo-100 dark:text-indigo-300 text-xl mb-10">
          Takes under two minutes. No login required. Results instantly.
        </p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-indigo-50 transition-all duration-[180ms] shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
        >
          Find My Scholarships
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-8 text-indigo-200 dark:text-indigo-400 text-sm">
          ScholarCopilot &nbsp;·&nbsp; Powered by Claude &nbsp;·&nbsp; Matching students with opportunities
        </p>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TrustSection />
      <CTAFooter />
    </>
  );
}
