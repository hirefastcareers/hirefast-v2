import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/">
          <HireFastLogo size="md" />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-[26px] font-bold tracking-tight">Terms</h1>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          TODO: legal review — placeholder only.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          By using HireFast you agree to provide accurate information, treat other users
          respectfully, and understand that applying for a role does not guarantee an
          interview or offer. Employers remain responsible for official right-to-work
          checks. HireFast is a UK recruitment platform connecting candidates and
          employers; we are not the employer unless stated.
        </p>
        <Link to="/jobs" className="text-sm text-blue-600 underline">
          Back to jobs
        </Link>
      </main>
    </div>
  );
}
