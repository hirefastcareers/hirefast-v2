import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/">
          <HireFastLogo size="md" />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-[26px] font-bold tracking-tight">Privacy</h1>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          TODO: legal review — placeholder only.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          HireFast stores only the outward code of your postcode (for example S35) and a
          rough location centroid used for commute matching. Your full postcode is
          validated briefly by our Edge Function and is never written to the database,
          localStorage, or application logs. Contact details you provide when applying
          are shared with the employer for that role only.
        </p>
        <Link to="/jobs" className="text-sm text-blue-600 underline">
          Back to jobs
        </Link>
      </main>
    </div>
  );
}
