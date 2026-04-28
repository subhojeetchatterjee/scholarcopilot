"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentProfile } from "@/types";

// ── Internal form state (all strings — cast to typed values on submit) ────────

type FormData = {
  full_name: string;
  age: string;
  state: string;
  preferred_language: string;
  class_or_degree: string;
  institution_type: string;
  career_goal: string;
  annual_family_income_range: string;
  category: string;
  gender: string;
  disability_status: string; // "true" | "false" | ""
  score_type: string;        // "percentage" | "cgpa"
  raw_score: string;
  cgpa_scale: string;        // "10" | "4" | ""
  conversion_method: string; // "none" | "cbse_9_5" | "x10" | "manual_percentage" | ""
  manual_normalized_percentage: string;
};

type StepErrors = Record<string, string>;

type StepProps = {
  data: FormData;
  set: (field: keyof FormData, value: string) => void;
  errors: StepErrors;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_TITLES = ["Basic details", "Education", "Eligibility", "Your score"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const COURSE_LEVELS = [
  { value: "Class 11",  label: "Class 11" },
  { value: "Class 12",  label: "Class 12" },
  { value: "UG",        label: "Undergraduate (UG)" },
  { value: "PG",        label: "Postgraduate (PG)" },
  { value: "Diploma",   label: "Diploma / Polytechnic" },
];

const INSTITUTION_TYPES = [
  { value: "Government School",  label: "Government School" },
  { value: "Private School",     label: "Private School" },
  { value: "Government College", label: "Government College" },
  { value: "Private College",    label: "Private College" },
  { value: "Deemed University",  label: "Deemed University" },
  { value: "IIT/NIT/IIIT",      label: "IIT / NIT / IIIT" },
  { value: "Other",              label: "Other" },
];

const INCOME_RANGES = [
  { value: "below_1L",    label: "Below ₹1 Lakh / year" },
  { value: "1L_to_2.5L", label: "₹1L – ₹2.5L / year" },
  { value: "2.5L_to_5L", label: "₹2.5L – ₹5L / year" },
  { value: "5L_to_8L",   label: "₹5L – ₹8L / year" },
  { value: "above_8L",   label: "Above ₹8L / year" },
];

const CATEGORIES = [
  { value: "General", label: "General" },
  { value: "OBC",     label: "OBC (Other Backward Class)" },
  { value: "SC",      label: "SC (Scheduled Caste)" },
  { value: "ST",      label: "ST (Scheduled Tribe)" },
  { value: "EWS",     label: "EWS (Economically Weaker Section)" },
  { value: "NT",      label: "NT (Nomadic Tribe)" },
  { value: "Other",   label: "Other" },
];

const GENDERS = [
  { value: "Male",              label: "Male" },
  { value: "Female",            label: "Female" },
  { value: "Transgender",       label: "Transgender" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "bn", label: "বাংলা" },
];

const INITIAL: FormData = {
  full_name: "",
  age: "",
  state: "",
  preferred_language: "en",
  class_or_degree: "",
  institution_type: "",
  career_goal: "",
  annual_family_income_range: "",
  category: "",
  gender: "",
  disability_status: "",
  score_type: "percentage",
  raw_score: "",
  cgpa_scale: "",
  conversion_method: "none",
  manual_normalized_percentage: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeNormalized(d: FormData): number | null {
  const raw = parseFloat(d.raw_score);
  if (isNaN(raw)) return null;
  if (d.score_type === "percentage") return Math.min(100, Math.max(0, raw));
  if (d.conversion_method === "cbse_9_5") return Math.min(100, Math.max(0, Math.round(raw * 9.5 * 100) / 100));
  if (d.conversion_method === "x10")      return Math.min(100, Math.max(0, Math.round(raw * 10 * 100) / 100));
  if (d.conversion_method === "manual_percentage") {
    const np = parseFloat(d.manual_normalized_percentage);
    return isNaN(np) ? null : Math.min(100, Math.max(0, np));
  }
  return null;
}

function validateStep(step: number, d: FormData): StepErrors {
  const e: StepErrors = {};
  if (step === 1) {
    if (!d.full_name.trim())      e.full_name = "Name is required";
    const age = parseInt(d.age);
    if (!d.age || isNaN(age) || age < 5 || age > 40) e.age = "Enter a valid age between 5 and 40";
    if (!d.state)                 e.state = "Select your state";
  }
  if (step === 2) {
    if (!d.class_or_degree)       e.class_or_degree = "Select your current class or course";
    if (!d.institution_type)      e.institution_type = "Select your institution type";
    if (!d.career_goal.trim())    e.career_goal = "Enter your career goal or field";
  }
  if (step === 3) {
    if (!d.annual_family_income_range) e.annual_family_income_range = "Select your annual income range";
    if (!d.category)              e.category = "Select your category";
    if (!d.gender)                e.gender = "Select gender";
    if (!d.disability_status)     e.disability_status = "Please answer this question";
  }
  if (step === 4) {
    const raw = parseFloat(d.raw_score);
    if (!d.raw_score || isNaN(raw)) {
      e.raw_score = "Enter your score";
    } else if (d.score_type === "percentage" && (raw < 0 || raw > 100)) {
      e.raw_score = "Percentage must be between 0 and 100";
    } else if (d.score_type === "cgpa" && d.cgpa_scale) {
      const max = d.cgpa_scale === "10" ? 10 : 4;
      if (raw < 0 || raw > max) e.raw_score = `CGPA must be between 0 and ${max}`;
    }
    if (d.score_type === "cgpa" && !d.cgpa_scale) {
      e.cgpa_scale = "Select your CGPA scale";
    }
    if (d.score_type === "cgpa" && (!d.conversion_method || d.conversion_method === "none" || d.conversion_method === "")) {
      e.conversion_method = "Select a conversion method for your CGPA";
    }
    if (d.conversion_method === "manual_percentage") {
      const np = parseFloat(d.manual_normalized_percentage);
      if (!d.manual_normalized_percentage || isNaN(np) || np < 0 || np > 100)
        e.manual_normalized_percentage = "Enter your equivalent percentage (0–100)";
    }
  }
  return e;
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
        {children}
      </label>
      {hint && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{msg}</p>;
}

function SelectInput({
  id, value, onChange, options, placeholder, error,
}: {
  id: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string; error?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-xl border px-4 py-3.5 text-sm text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/70 appearance-none cursor-pointer ${
        error
          ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
      }`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TextInput({
  id, value, onChange, placeholder, type = "text", error,
}: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; error?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-4 py-3.5 text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/70 ${
        error
          ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
      }`}
    />
  );
}

function RadioGroup({
  name, value, onChange, options, cols = 2,
}: {
  name: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
  cols?: 2 | 3;
}) {
  return (
    <div className={cols === 3 ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-3"}>
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-colors ${
            value === o.value
              ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:border-indigo-500/80 dark:bg-indigo-950/40 dark:ring-indigo-500/60"
              : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-0.5 accent-indigo-600 flex-shrink-0"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-200 block">{o.label}</span>
            {o.hint && <span className="text-xs text-gray-400 dark:text-slate-500">{o.hint}</span>}
          </div>
        </label>
      ))}
    </div>
  );
}

// ── Progress indicator ────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-5">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={i < total - 1 ? "flex items-center flex-1" : "flex items-center"}>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                i + 1 < current
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                  : i + 1 === current
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600"
              }`}
            >
              {i + 1 < current ? "✓" : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-0.5 flex-1 mx-1.5 transition-colors ${i + 1 < current ? "bg-indigo-600 dark:bg-indigo-500" : "bg-gray-200 dark:bg-slate-700"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
        Step {current} of {total}
      </p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{STEP_TITLES[current - 1]}</h2>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function Step1({ data: d, set, errors: e }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <TextInput id="full_name" value={d.full_name} onChange={(v) => set("full_name", v)}
          placeholder="e.g. Priya Sharma" error={e.full_name} />
        <Err msg={e.full_name} />
      </div>

      <div>
        <Label htmlFor="age">Age</Label>
        <TextInput id="age" type="number" value={d.age} onChange={(v) => set("age", v)}
          placeholder="e.g. 18" error={e.age} />
        <Err msg={e.age} />
      </div>

      <div>
        <Label htmlFor="state" hint="Required for state-specific scholarship matching">
          State or Union Territory
        </Label>
        <SelectInput id="state" value={d.state} onChange={(v) => set("state", v)}
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
          placeholder="Select your state" error={e.state} />
        <Err msg={e.state} />
      </div>

      <div>
        <Label htmlFor="preferred_language" hint="Used for AI explanations and translated results">
          Preferred language for results
        </Label>
        <RadioGroup name="preferred_language" value={d.preferred_language}
          onChange={(v) => set("preferred_language", v)} options={LANGUAGES} cols={3} />
        <Err msg={e.preferred_language} />
      </div>
    </div>
  );
}

function Step2({ data: d, set, errors: e }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="class_or_degree" hint="Determines which scholarships you are eligible to apply for">
          Current class or course level
        </Label>
        <SelectInput id="class_or_degree" value={d.class_or_degree}
          onChange={(v) => set("class_or_degree", v)} options={COURSE_LEVELS}
          placeholder="Select class or course" error={e.class_or_degree} />
        <Err msg={e.class_or_degree} />
      </div>

      <div>
        <Label htmlFor="institution_type">Institution type</Label>
        <SelectInput id="institution_type" value={d.institution_type}
          onChange={(v) => set("institution_type", v)} options={INSTITUTION_TYPES}
          placeholder="Select institution type" error={e.institution_type} />
        <Err msg={e.institution_type} />
      </div>

      <div>
        <Label htmlFor="career_goal" hint="Used by AI when drafting application answers">
          Career goal or field of interest
        </Label>
        <TextInput id="career_goal" value={d.career_goal} onChange={(v) => set("career_goal", v)}
          placeholder="e.g. Engineering, Medicine, Teaching" error={e.career_goal} />
        <Err msg={e.career_goal} />
      </div>
    </div>
  );
}

function Step3({ data: d, set, errors: e }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="annual_family_income_range" hint="Combined annual income from all family members and sources">
          Annual family income
        </Label>
        <SelectInput id="annual_family_income_range" value={d.annual_family_income_range}
          onChange={(v) => set("annual_family_income_range", v)} options={INCOME_RANGES}
          placeholder="Select income range" error={e.annual_family_income_range} />
        <Err msg={e.annual_family_income_range} />
      </div>

      <div>
        <Label htmlFor="category" hint="As stated on your government-issued certificate, if applicable">
          Category
        </Label>
        <SelectInput id="category" value={d.category} onChange={(v) => set("category", v)}
          options={CATEGORIES} placeholder="Select your category" error={e.category} />
        <Err msg={e.category} />
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <SelectInput id="gender" value={d.gender} onChange={(v) => set("gender", v)}
          options={GENDERS} placeholder="Select gender" error={e.gender} />
        <Err msg={e.gender} />
      </div>

      <div>
        <Label htmlFor="disability_status"
          hint="Some scholarships are exclusively for students with benchmark disabilities">
          Do you have a disability?
        </Label>
        <RadioGroup
          name="disability_status"
          value={d.disability_status}
          onChange={(v) => set("disability_status", v)}
          options={[
            { value: "false", label: "No" },
            { value: "true",  label: "Yes — I have a disability certificate" },
          ]}
        />
        <Err msg={e.disability_status} />
      </div>
    </div>
  );
}

function Step4({ data: d, set, errors: e }: StepProps) {
  const normalizedPreview = computeNormalized(d);

  const maxRaw = d.score_type === "cgpa" && d.cgpa_scale
    ? d.cgpa_scale === "10" ? 10 : 4
    : 100;

  function handleScoreTypeChange(v: string) {
    set("score_type", v);
    set("raw_score", "");
    set("cgpa_scale", "");
    set("manual_normalized_percentage", "");
    set("conversion_method", v === "percentage" ? "none" : "");
  }

  return (
    <div className="space-y-5">
      {/* Score type */}
      <div>
        <Label htmlFor="score_type">How are your marks reported?</Label>
        <RadioGroup
          name="score_type"
          value={d.score_type}
          onChange={handleScoreTypeChange}
          options={[
            { value: "percentage", label: "Percentage",  hint: "e.g. 85.4%" },
            { value: "cgpa",       label: "CGPA / GPA", hint: "e.g. 8.5 / 10" },
          ]}
        />
      </div>

      {/* CGPA scale — only shown when CGPA is selected */}
      {d.score_type === "cgpa" && (
        <div>
          <Label htmlFor="cgpa_scale" hint="Check your marksheet for the maximum possible CGPA">
            CGPA scale
          </Label>
          <RadioGroup
            name="cgpa_scale"
            value={d.cgpa_scale}
            onChange={(v) => { set("cgpa_scale", v); set("raw_score", ""); }}
            options={[
              { value: "10", label: "Out of 10", hint: "Most Indian universities" },
              { value: "4",  label: "Out of 4",  hint: "Some deemed / international" },
            ]}
          />
          <Err msg={e.cgpa_scale} />
        </div>
      )}

      {/* Raw score input */}
      <div>
        <Label htmlFor="raw_score">
          {d.score_type === "percentage"
            ? "Your percentage (0 – 100)"
            : `Your CGPA (0 – ${maxRaw})`}
        </Label>
        <TextInput
          id="raw_score"
          type="number"
          value={d.raw_score}
          onChange={(v) => set("raw_score", v)}
          placeholder={
            d.score_type === "percentage"
              ? "e.g. 82.5"
              : d.cgpa_scale === "4"
              ? "e.g. 3.7"
              : "e.g. 8.5"
          }
          error={e.raw_score}
        />
        <Err msg={e.raw_score} />
      </div>

      {/* Conversion method — only shown for CGPA with a scale selected */}
      {d.score_type === "cgpa" && d.cgpa_scale && (
        <div>
          <Label htmlFor="conversion_method"
            hint="This converts your CGPA to a percentage used for scholarship matching">
            How should we convert your CGPA?
          </Label>
          <SelectInput
            id="conversion_method"
            value={d.conversion_method === "none" ? "" : d.conversion_method}
            onChange={(v) => { set("conversion_method", v); set("manual_normalized_percentage", ""); }}
            options={[
              { value: "cbse_9_5",           label: `CBSE formula  (CGPA × 9.5)` },
              { value: "x10",                label: `Multiply by 10  (CGPA × 10)` },
              { value: "manual_percentage",  label: "Enter equivalent percentage myself" },
            ]}
            placeholder="Select conversion method"
            error={e.conversion_method}
          />
          <Err msg={e.conversion_method} />
        </div>
      )}

      {/* Manual normalized percentage — only shown for manual_percentage method */}
      {d.conversion_method === "manual_percentage" && (
        <div>
          <Label htmlFor="manual_normalized_percentage"
            hint="Enter the percentage equivalent as stated by your institution or board">
            Your equivalent percentage (0 – 100)
          </Label>
          <TextInput
            id="manual_normalized_percentage"
            type="number"
            value={d.manual_normalized_percentage}
            onChange={(v) => set("manual_normalized_percentage", v)}
            placeholder="e.g. 76"
            error={e.manual_normalized_percentage}
          />
          <Err msg={e.manual_normalized_percentage} />
        </div>
      )}

      {/* Normalized percentage preview */}
      {normalizedPreview !== null && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
            Percentage used for matching
          </p>
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{normalizedPreview.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            This is compared against the minimum marks requirement of each scholarship.
          </p>
        </div>
      )}

      {/* Review summary — inline before submit */}
      <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
          Profile summary
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Name",     d.full_name        || "—"],
            ["State",    d.state            || "—"],
            ["Course",   d.class_or_degree  || "—"],
            ["Category", d.category         || "—"],
            ["Income",   d.annual_family_income_range?.replace(/_/g, " ") || "—"],
            ["Score",    normalizedPreview !== null ? `${normalizedPreview.toFixed(1)}%` : "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-slate-500">{label}</p>
              <p className="font-medium text-gray-900 dark:text-slate-200 truncate">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Profile saved!</h2>
      <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs mx-auto mb-8">
        Your profile is ready. We&apos;ll use it to find scholarships you&apos;re most
        likely to qualify for and explain each match.
      </p>
      <button
        onClick={onContinue}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold rounded-xl text-lg transition-colors"
      >
        Find My Scholarships →
      </button>
      <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
        Results are guidance only. Always verify on official scholarship pages.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const router = useRouter();
  const [step,     setStep]     = useState(1);
  const [data,     setData]     = useState<FormData>(INITIAL);
  const [errors,   setErrors]   = useState<StepErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const TOTAL = 4;

  function set(field: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleNext() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setApiError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const errs = validateStep(4, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError(null);

    const np = computeNormalized(data) ?? 0;

    const payload: StudentProfile = {
      full_name:                   data.full_name.trim(),
      age:                         parseInt(data.age),
      state:                       data.state,
      preferred_language:          data.preferred_language as StudentProfile["preferred_language"],
      class_or_degree:             data.class_or_degree,
      institution_type:            data.institution_type as StudentProfile["institution_type"],
      career_goal:                 data.career_goal.trim(),
      annual_family_income_range:  data.annual_family_income_range as StudentProfile["annual_family_income_range"],
      category:                    data.category as StudentProfile["category"],
      gender:                      data.gender as StudentProfile["gender"],
      disability_status:           data.disability_status === "true",
      score_type:                  data.score_type as "percentage" | "cgpa",
      raw_score:                   parseFloat(data.raw_score),
      cgpa_scale:                  data.score_type === "cgpa" && data.cgpa_scale
                                     ? (data.cgpa_scale as "10" | "4")
                                     : null,
      conversion_method:           data.score_type === "percentage"
                                     ? "none"
                                     : (data.conversion_method as StudentProfile["conversion_method"]),
      normalized_percentage:       np,
    };

    try {
      const res  = await fetch("/api/profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error?.fields) setErrors(json.error.fields);
        setApiError(json.error?.message ?? json.message ?? "Validation failed. Please review your answers.");
        setLoading(false);
        return;
      }

      // Store validated (server-normalized) profile for /matches
      sessionStorage.setItem("sc_profile", JSON.stringify(json.profile));
      setDone(true);
    } catch {
      setApiError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <SuccessState onContinue={() => router.push("/matches")} />;
  }

  return (
    <div>
      <ProgressBar current={step} total={TOTAL} />

      {step === 1 && <Step1 data={data} set={set} errors={errors} />}
      {step === 2 && <Step2 data={data} set={set} errors={errors} />}
      {step === 3 && <Step3 data={data} set={set} errors={errors} />}
      {step === 4 && <Step4 data={data} set={set} errors={errors} />}

      {/* Top-level API error */}
      {apiError && (
        <div className="mt-5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{apiError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex-1 py-3.5 border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
          >
            ← Back
          </button>
        )}
        {step < TOTAL ? (
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold rounded-xl transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? "Saving…" : "Save Profile →"}
          </button>
        )}
      </div>
    </div>
  );
}
