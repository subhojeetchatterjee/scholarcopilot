import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Minimal nav */}
      <nav className="bg-white/85 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-lg">
            Scholar<span className="text-indigo-600 dark:text-indigo-400">Copilot</span>
          </Link>
        </div>
      </nav>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-10">
        <ProfileForm />
      </div>

      {/* Ethics note */}
      <div className="max-w-lg mx-auto px-4 pb-12 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          Your data stays in your browser session and is never stored on a server.
          Results are guidance only — always verify eligibility on official scholarship pages.
        </p>
      </div>
    </div>
  );
}
