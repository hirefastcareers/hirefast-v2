import { Outlet, Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

export default function CandidateLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <HireFastLogo size="md" />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/jobs" className="text-slate-500 hover:text-slate-900">
              Jobs
            </Link>
            <Link to="/me/applications" className="text-slate-500 hover:text-slate-900">
              Applications
            </Link>
            <Link to="/me" className="text-slate-500 hover:text-slate-900">
              Profile
            </Link>
            <Link to="/settings" className="text-slate-500 hover:text-slate-900">
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
