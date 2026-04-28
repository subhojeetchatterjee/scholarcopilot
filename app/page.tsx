import Link from "next/link";

// ── Data (preserved verbatim from previous version) ───────────────────────────

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
  },
  {
    icon: "🌐",
    title: "Multilingual Support",
    body: "Read match explanations in English, Hindi, or Bengali — whichever you are most comfortable with.",
  },
  {
    icon: "📅",
    title: "Deadline Tracking",
    body: "Colour-coded urgency badges on every card. See exactly how many days you have left before the deadline closes.",
  },
  {
    icon: "📋",
    title: "Document Checklist",
    body: "Every scholarship lists exactly which documents to gather — Aadhaar, income certificate, caste certificate, and more.",
  },
  {
    icon: "🤖",
    title: "AI Match Explanation",
    body: "Claude reads your profile and the scholarship rules, then explains your result in a single clear paragraph.",
  },
  {
    icon: "✍️",
    title: "Application Drafting",
    body: "Paste the application question and Claude drafts a response using only facts you provided — nothing fabricated.",
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
    <nav className="fixed top-0 inset-x-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between rounded-2xl px-5 py-3 sc-glass-button">
          <Link
            href="/"
            className="font-semibold tracking-tight text-base text-slate-900 dark:text-white"
          >
            ScholarCopilot
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white sc-cta-glow"
          >
            Find My Scholarships
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-40 pb-32 px-4 sc-hero-bg">
      <div className="sc-beam" aria-hidden />
      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="sc-reveal sc-reveal-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide bg-white/70 border border-slate-200 text-slate-600 dark:bg-white/[0.04] dark:border-white/10 dark:text-slate-300 mb-12 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
          Matching you to the finest opportunities!
        </div>

        {/* Headline */}
        <h1 className="sc-reveal sc-reveal-2 sc-serif text-5xl sm:text-6xl md:text-7xl font-medium text-slate-900 dark:text-white leading-[1.05] mb-8 max-w-4xl mx-auto">
          Find scholarships you actually qualify for
        </h1>

        {/* Subheadline */}
        <p className="sc-reveal sc-reveal-3 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          ScholarCopilot matches Indian students in Class 11, 12, and undergrad
          with the right scholarships — using rule-based eligibility, not guesswork.
          Then Claude explains why and helps you apply faster.
        </p>

        {/* CTAs */}
        <div className="sc-reveal sc-reveal-4 flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-medium text-white sc-cta-glow"
          >
            Find My Scholarships
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 sc-glass-button"
          >
            See How It Works
          </a>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-500">
          No login required &nbsp;·&nbsp; Free to use &nbsp;·&nbsp; Results in under 10 seconds
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section id="problem" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="sc-serif italic text-base text-slate-500 dark:text-slate-400 mb-4">The Problem.</p>
          <h2 className="sc-serif text-4xl sm:text-5xl font-medium text-slate-900 dark:text-white leading-[1.1] mb-5 max-w-3xl mx-auto">
            Finding the right scholarship is harder than it should be
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Three compounding problems stop Indian students from getting scholarships they deserve.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              className="relative p-7 rounded-2xl sc-glass-card"
            >
              <span className="absolute top-5 right-6 text-xs text-slate-400 dark:text-slate-500 tabular-nums tracking-tight">
                {String(i + 1).padStart(2, "0")}.
              </span>
              <span className="text-3xl block mb-5" aria-hidden>{p.icon}</span>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">{p.title}</h3>
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
    <section id="how-it-works" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="sc-serif italic text-base text-slate-500 dark:text-slate-400 mb-4">How it works.</p>
          <h2 className="sc-serif text-4xl sm:text-5xl font-medium text-slate-900 dark:text-white leading-[1.1] max-w-3xl mx-auto">
            From profile to application in four steps
          </h2>
        </div>

        <div className="relative">
          {/* Connecting timeline line — desktop only */}
          <div className="hidden md:block absolute top-1.5 left-[12%] right-[12%] h-px sc-step-line" />

          <div className="grid md:grid-cols-4 gap-5 relative">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                {/* Glowing dot — desktop only, sits on the line */}
                <div className="hidden md:block w-3 h-3 rounded-full sc-step-dot mx-auto mb-10 relative z-10" />

                <div className="relative p-6 rounded-2xl sc-glass-card h-full">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="sc-serif text-3xl font-light text-slate-300 dark:text-white/15 tabular-nums leading-none">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="sc-serif italic text-base text-slate-500 dark:text-slate-400 mb-4">Features</p>
          <h2 className="sc-serif text-4xl sm:text-5xl font-medium text-slate-900 dark:text-white leading-[1.1] mb-5 max-w-3xl mx-auto">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Designed for a hackathon timeline — built to solve a real problem for real students.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-7 rounded-2xl sc-glass-card"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 dark:bg-white/[0.04] dark:border-white/10 flex items-center justify-center mb-5 text-xl">
                <span aria-hidden>{f.icon}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section id="trust" className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="sc-serif text-4xl sm:text-5xl font-medium text-slate-900 dark:text-white leading-[1.1]">
            Built with transparency
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-12 max-w-5xl mx-auto">
          {TRUST.map((t, i) => (
            <div key={t.title} className="relative pt-5 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums tracking-tight mb-3 absolute -top-2.5 left-0 bg-white dark:bg-[#06070d] pr-3">
                {String(i + 1).padStart(2, "0")}.
              </p>
              <p className="font-semibold text-slate-900 dark:text-white text-base mb-3">{t.title}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFooter() {
  return (
    <section className="relative pt-32 pb-12 px-4 overflow-hidden">
      {/* Subtle bottom accent glow */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(99,102,241,0.12), transparent 70%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="sc-serif text-4xl sm:text-5xl font-medium text-slate-900 dark:text-white leading-[1.1] mb-5">
          Ready to find your scholarships?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-base mb-12">
          Takes under two minutes. No login required. Results instantly.
        </p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-medium text-white sc-cta-glow"
        >
          Find My Scholarships
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Footer line */}
      <div className="relative mt-32 pt-8 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto">
        <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
          ScholarCopilot &nbsp;·&nbsp; Supported by Claude &nbsp;·&nbsp; Built for students
        </p>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative bg-white text-slate-900 dark:bg-[#06070d] dark:text-white">
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TrustSection />
      <CTAFooter />
    </div>
  );
}
