"use client";

import { useEffect, useState } from "react";
import type { MatchResult, Scholarship, StudentProfile } from "@/types";
import MatchBadge from "@/components/MatchBadge";
import LanguageSelector from "@/components/LanguageSelector";
import AIAnswerPanel from "@/components/AIAnswerPanel";
import { getCached, setCached, profileFingerprint as mkFingerprint } from "@/lib/aiCache";

interface Props {
  id: string;
}

type ActionState = "idle" | "loading" | "success" | "error";

export default function MatchSection({ id }: Props) {
  const [result,     setResult]     = useState<MatchResult | null>(null);
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [profile,    setProfile]    = useState<StudentProfile | null>(null);
  const [loaded,     setLoaded]     = useState(false);

  const [explainState, setExplainState] = useState<ActionState>("idle");
  const [explanation,  setExplanation]  = useState("");
  const [explainError, setExplainError] = useState("");

  const [draftState, setDraftState] = useState<ActionState>("idle");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftError,  setDraftError]  = useState("");

  // Translation state — one set per AI output block
  const [explainLang,           setExplainLang]           = useState<"en" | "hi" | "bn">("en");
  const [explainSource,         setExplainSource]         = useState("");
  const [explainTranslating,    setExplainTranslating]    = useState(false);
  const [explainTranslateError, setExplainTranslateError] = useState("");

  const [draftLang,           setDraftLang]           = useState<"en" | "hi" | "bn">("en");
  const [draftSource,         setDraftSource]         = useState("");
  const [draftTranslating,    setDraftTranslating]    = useState(false);
  const [draftTranslateError, setDraftTranslateError] = useState("");

  // Follow-up state — only active when result.status === "insufficient_data"
  const [followupState, setFollowupState] = useState<ActionState>("idle");
  const [followupError, setFollowupError] = useState("");
  const [questions,     setQuestions]     = useState<string[]>([]);
  const [answers,       setAnswers]       = useState<string[]>([]);
  const [followupDone,  setFollowupDone]  = useState(false);

  useEffect(() => {
    try {
      let profileData: StudentProfile | null = null;
      let followupAlreadyDone = false;

      const rawProfile = sessionStorage.getItem("sc_profile");
      if (rawProfile) {
        profileData = JSON.parse(rawProfile) as StudentProfile;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading sessionStorage is browser-only; useEffect is the correct SSR-safe location
        setProfile(profileData);
      }

      if (sessionStorage.getItem(`sc_followup_${id}`)) {
        followupAlreadyDone = true;
        setFollowupDone(true);
      }

      const rawMatch = sessionStorage.getItem("sc_match_response");
      if (rawMatch) {
        const { results, scholarships } = JSON.parse(rawMatch) as {
          results: MatchResult[];
          scholarships: Scholarship[];
        };
        const idx = results.findIndex((r) => r.scholarship_id === id);
        if (idx !== -1) {
          setResult(results[idx]);
          setScholarship(scholarships[idx] ?? null);

          // Restore cached AI outputs so revisiting the page shows prior results instantly
          if (profileData) {
            const fp = mkFingerprint(profileData);

            const cachedExplain = getCached(`sc_ai:explain:${id}:${fp}`);
            if (cachedExplain) {
              setExplanation(cachedExplain);
              setExplainSource(cachedExplain);
              setExplainLang(profileData.preferred_language ?? "en");
              setExplainState("success");
            }

            const cachedDraft = getCached(`sc_ai:draft:${id}:${fp}`);
            if (cachedDraft) {
              setDraftAnswer(cachedDraft);
              setDraftSource(cachedDraft);
              setDraftLang(profileData.preferred_language ?? "en");
              setDraftState("success");
            }

            if (!followupAlreadyDone) {
              const cachedFollowup = getCached(`sc_ai:followup:${id}:${fp}`);
              if (cachedFollowup) {
                const qs: string[] = JSON.parse(cachedFollowup);
                if (qs.length > 0) {
                  setQuestions(qs);
                  setAnswers(qs.map(() => ""));
                  setFollowupState("success");
                }
              }
            }
          }
        }
      }
    } catch {
      // sessionStorage unavailable or invalid JSON — silently degrade
    }
    setLoaded(true);
  }, [id]);

  async function handleExplain() {
    if (!result) return;

    if (!profile) {
      setExplainState("error");
      setExplainError("Profile not found in session. Please complete your profile first.");
      return;
    }

    if (!scholarship) {
      setExplainState("error");
      setExplainError("Scholarship data not found. Return to matches and try again.");
      return;
    }

    const fp = mkFingerprint(profile);
    const cacheKey = `sc_ai:explain:${id}:${fp}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setExplanation(cached);
      setExplainSource(cached);
      setExplainLang(profile.preferred_language ?? "en");
      setExplainState("success");
      return;
    }

    setExplainState("loading");
    setExplainError("");

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          scholarship,
          match_result: result,
          language: profile.preferred_language ?? "en",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }

      const { explanation: text } = await res.json() as { explanation: string };
      setExplanation(text);
      setExplainSource(text);
      setExplainLang(profile.preferred_language ?? "en");
      setExplainState("success");
      setCached(cacheKey, text);
    } catch (err) {
      setExplainError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setExplainState("error");
    }
  }

  async function handleDraft() {
    if (!profile) {
      setDraftState("error");
      setDraftError("Profile not found in session. Please complete your profile first.");
      return;
    }

    if (!scholarship) {
      setDraftState("error");
      setDraftError("Scholarship data not found. Return to matches and try again.");
      return;
    }

    if (result?.status === "not_eligible") {
      return;
    }

    const fp = mkFingerprint(profile);
    const cacheKey = `sc_ai:draft:${id}:${fp}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setDraftAnswer(cached);
      setDraftSource(cached);
      setDraftLang(profile.preferred_language ?? "en");
      setDraftState("success");
      return;
    }

    setDraftState("loading");
    setDraftError("");

    try {
      const res = await fetch("/api/draft-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          scholarship,
          prompt: "Why do you deserve this scholarship?",
          language: profile.preferred_language ?? "en",
          match_result_status: result?.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }

      const { answer } = await res.json() as { answer: string };
      setDraftAnswer(answer);
      setDraftSource(answer);
      setDraftLang(profile.preferred_language ?? "en");
      setDraftState("success");
      setCached(cacheKey, answer);
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setDraftState("error");
    }
  }

  async function translate(
    source: string,
    targetLang: "en" | "hi" | "bn",
    setText: (t: string) => void,
    setLang: (l: "en" | "hi" | "bn") => void,
    setTranslating: (b: boolean) => void,
    setError: (e: string) => void,
    cacheKey: string | null = null,
  ) {
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached) { setText(cached); setLang(targetLang); return; }
    }
    setTranslating(true);
    setError("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, target_language: targetLang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }
      const { translation } = await res.json() as { translation: string };
      setText(translation);
      setLang(targetLang);
      if (cacheKey) setCached(cacheKey, translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed.");
    } finally {
      setTranslating(false);
    }
  }

  function handleExplainLangChange(lang: "en" | "hi" | "bn") {
    if (lang === explainLang || explainTranslating) return;
    const fp = profile ? mkFingerprint(profile) : null;
    const cacheKey = fp ? `sc_ai:translate:explain:${id}:${fp}:${lang}` : null;
    translate(explainSource, lang, setExplanation, setExplainLang, setExplainTranslating, setExplainTranslateError, cacheKey);
  }

  function handleDraftLangChange(lang: "en" | "hi" | "bn") {
    if (lang === draftLang || draftTranslating) return;
    const fp = profile ? mkFingerprint(profile) : null;
    const cacheKey = fp ? `sc_ai:translate:draft:${id}:${fp}:${lang}` : null;
    translate(draftSource, lang, setDraftAnswer, setDraftLang, setDraftTranslating, setDraftTranslateError, cacheKey);
  }

  async function handleFetchFollowup() {
    if (!profile || !scholarship || !result) return;

    const fp = mkFingerprint(profile);
    const cacheKey = `sc_ai:followup:${id}:${fp}`;
    const cachedRaw = getCached(cacheKey);
    if (cachedRaw) {
      try {
        const qs: string[] = JSON.parse(cachedRaw);
        if (qs.length === 0) { setFollowupDone(true); return; }
        setQuestions(qs);
        setAnswers(qs.map(() => ""));
        setFollowupState("success");
        return;
      } catch { /* corrupted entry — fall through to API */ }
    }

    setFollowupState("loading");
    setFollowupError("");
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          scholarship,
          match_result: result,
          language: profile.preferred_language ?? "en",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `Server error ${res.status}`);
      }
      const { questions: qs } = await res.json() as { questions: string[] };
      setCached(cacheKey, JSON.stringify(qs));
      if (qs.length === 0) {
        // Nothing to ask — unlock AI tools immediately
        setFollowupDone(true);
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setFollowupState("success");
    } catch (err) {
      setFollowupError(err instanceof Error ? err.message : "Failed to load questions.");
      setFollowupState("error");
    }
  }

  function handleSubmitFollowup() {
    try {
      sessionStorage.setItem(
        `sc_followup_${id}`,
        JSON.stringify({ questions, answers })
      );
    } catch {
      // sessionStorage unavailable — proceed anyway
    }
    setFollowupDone(true);
  }

  if (!loaded) return null;

  return (
    <div className="space-y-5">
      {/* ── Match result ─────────────────────────────────────────────────── */}
      {result ? (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Your match result
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                Score&nbsp;
                <span className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">{result.score}</span>
                <span className="text-xs text-slate-400 dark:text-slate-600">/100</span>
              </span>
              <MatchBadge status={result.status} />
            </div>
          </div>

          {/* Partial-match context note: shown when some dimensions aligned but a hard blocker fired */}
          {result.status === "not_eligible" && result.score > 0 && (
            <p className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg px-3 py-2 mb-5">
              Some profile details align with this scholarship, but one or more hard requirements are not met.
            </p>
          )}

          {result.match_reasons.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-[0.1em] mb-3">
                {result.status === "not_eligible" ? "Aligned with your profile" : "Why this matched"}
              </p>
              <ul className="space-y-2">
                {result.match_reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mt-0.5 flex-shrink-0" aria-hidden>
                      <path d="M3 8l4 4 6-7"/>
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missing_reasons.length > 0 && (
            <div className={result.match_reasons.length > 0 ? "pt-5 border-t border-slate-100 dark:border-slate-800" : ""}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.1em] mb-3 ${
                result.status === "not_eligible"
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-amber-700 dark:text-amber-500"
              }`}>
                {result.status === "not_eligible" ? "Why not eligible" : "Unclear or missing"}
              </p>
              <ul className="space-y-2">
                {result.missing_reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    {result.status === "not_eligible" ? (
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" aria-hidden>
                        <circle cx="8" cy="8" r="6.5"/>
                        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/>
                      </svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 flex-shrink-0 mt-[0.45em]" aria-hidden />
                    )}
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Match result not available.{" "}
            <a href="/matches" className="text-indigo-500 hover:underline">
              Run matching first →
            </a>
          </p>
        </div>
      )}

      {/* ── Follow-up panel (insufficient_data only) ─────────────────────── */}
      {result?.status === "insufficient_data" && !followupDone && (
        <section className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-6">
          <div className="flex items-start gap-2.5 mb-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden>
              <path d="M8 2L14 13H2L8 2z"/>
              <path d="M8 6.5v3M8 11v.5"/>
            </svg>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Missing details needed
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 ml-[26px]">
            Some information is missing to fully evaluate this scholarship.
            Answer a few quick questions to unlock AI tools.
          </p>

          {followupState === "idle" && (
            <button
              onClick={handleFetchFollowup}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-all duration-[180ms] hover:-translate-y-px hover:shadow-md"
            >
              Complete missing details
            </button>
          )}

          {followupState === "loading" && (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <svg className="animate-spin w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading questions…
            </div>
          )}

          {followupState === "error" && (
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">{followupError}</p>
              <button
                onClick={() => setFollowupState("idle")}
                className="text-xs text-red-600 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
              >
                Retry
              </button>
            </div>
          )}

          {followupState === "success" && questions.length > 0 && (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {q}
                  </label>
                  <input
                    type="text"
                    value={answers[i]}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = e.target.value;
                      setAnswers(next);
                    }}
                    placeholder="Your answer"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500/60"
                  />
                </div>
              ))}
              <button
                onClick={handleSubmitFollowup}
                disabled={answers.some((a) => !a.trim())}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-[180ms] hover:-translate-y-px hover:shadow-md"
              >
                Save &amp; unlock AI tools
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── AI-powered actions ────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
          AI-powered tools
        </h2>

        {result?.status === "insufficient_data" && !followupDone && (
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 mb-4">
            Complete the missing details above to unlock these tools.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Explain button */}
          <button
            onClick={handleExplain}
            disabled={!result || explainState === "loading" || (result.status === "insufficient_data" && !followupDone)}
            className={[
              "flex items-center gap-2.5 py-3 px-4 rounded-xl border text-sm text-left transition-all duration-[180ms]",
              !result || explainState === "loading" || (result.status === "insufficient_data" && !followupDone)
                ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                : "border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 hover:-translate-y-px hover:shadow-sm cursor-pointer",
            ].join(" ")}
          >
            <span className="text-base" aria-hidden>🤖</span>
            <span className="flex-1 font-medium">
              {explainState === "loading" ? "Explaining…" : "Explain this match"}
            </span>
          </button>

          {/* Draft answer button */}
          <button
            onClick={handleDraft}
            disabled={!scholarship || draftState === "loading" || result?.status === "not_eligible" || (result?.status === "insufficient_data" && !followupDone)}
            className={[
              "flex items-center gap-2.5 py-3 px-4 rounded-xl border text-sm text-left transition-all duration-[180ms]",
              !scholarship || draftState === "loading" || result?.status === "not_eligible" || (result?.status === "insufficient_data" && !followupDone)
                ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                : "border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/60 hover:-translate-y-px hover:shadow-sm cursor-pointer",
            ].join(" ")}
          >
            <span className="text-base" aria-hidden>✍️</span>
            <span className="flex-1 font-medium">
              {draftState === "loading" ? "Drafting…" : "Draft application answer"}
            </span>
          </button>
        </div>

        {/* Advisory note — drafting unavailable for not_eligible */}
        {result?.status === "not_eligible" && (
          <p className="mt-3 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg px-3 py-2">
            Draft answers are not available — this scholarship&apos;s eligibility criteria are not met by the current profile. Focus on better-matched scholarships instead.
          </p>
        )}

        {/* Explanation card — shown after successful call */}
        {explainState === "success" && (
          <AIAnswerPanel
            content={explanation}
            variant="explain"
            languageSelector={
              <LanguageSelector value={explainLang} onChange={handleExplainLangChange} />
            }
            translating={explainTranslating}
            translateError={explainTranslateError}
            className="mt-5"
          />
        )}

        {/* Explain error with retry */}
        {explainState === "error" && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 dark:text-red-500 mt-0.5 flex-shrink-0" aria-hidden>
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 5v3.5M8 10.5v.5"/>
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">{explainError}</p>
              <button
                onClick={() => setExplainState("idle")}
                className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Draft answer card — shown after successful call */}
        {draftState === "success" && (
          <AIAnswerPanel
            content={draftAnswer}
            variant="draft"
            languageSelector={
              <LanguageSelector value={draftLang} onChange={handleDraftLangChange} />
            }
            translating={draftTranslating}
            translateError={draftTranslateError}
            className="mt-5"
          />
        )}

        {/* Draft error with retry */}
        {draftState === "error" && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 dark:text-red-500 mt-0.5 flex-shrink-0" aria-hidden>
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 5v3.5M8 10.5v.5"/>
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">{draftError}</p>
              <button
                onClick={() => setDraftState("idle")}
                className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
