import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";

/** Legacy register route — apply no longer requires pre-registration. */
export default function Register() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/">
          <HireFastLogo size="md" />
        </Link>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <h1 className="text-[26px] font-bold tracking-tight">No account needed to apply</h1>
        <p className="text-sm text-slate-500">
          Browse jobs and apply in three fields. You can add an email afterwards for updates —
          no password, ever.
        </p>
        <Button asChild size="lg" className="h-12 w-full rounded-xl bg-blue-600 text-white">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
        <p className="text-sm text-slate-500">
          Optional profile editing lives under{" "}
          <Link to="/me" className="text-blue-600 underline">
            /me
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
