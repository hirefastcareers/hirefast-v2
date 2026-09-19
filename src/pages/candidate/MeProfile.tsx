import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";

export default function MeProfile() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/">
            <HireFastLogo size="md" />
          </Link>
          <Link to="/jobs" className="text-sm text-blue-600">
            Jobs
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-[26px] font-bold tracking-tight">Your profile</h1>
        <p className="text-sm text-slate-500">
          Applying no longer requires onboarding. These steps are optional — use them
          to sharpen matches after you apply.
        </p>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Link
            to="/candidate/verify"
            className="block px-4 py-4 active:bg-slate-50"
          >
            <p className="font-medium">Right to work & checks</p>
            <p className="text-sm text-slate-500">Optional — RTW, NI, DBS, phone</p>
          </Link>
          <Link
            to="/candidate/shifts"
            className="block px-4 py-4 active:bg-slate-50"
          >
            <p className="font-medium">Shifts & skills</p>
            <p className="text-sm text-slate-500">Optional preferences</p>
          </Link>
          <Link to="/settings" className="block px-4 py-4 active:bg-slate-50">
            <p className="font-medium">Settings & CV</p>
            <p className="text-sm text-slate-500">Email, CV upload</p>
          </Link>
        </div>
        <Button asChild size="lg" className="w-full rounded-xl bg-blue-600 text-white">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </main>
    </div>
  );
}
