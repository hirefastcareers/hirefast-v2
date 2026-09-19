import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { useOrg } from "@/contexts/OrgContext";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function RecruiterShell({
  children,
  showNav = true,
}: {
  children: ReactNode;
  showNav?: boolean;
}) {
  const { employerId, employerIds, companyNames, setEmployerId, isRecruiter } =
    useOrg();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {showNav && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link to="/recruiter">
              <HireFastLogo size="md" />
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link to="/recruiter" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link to="/recruiter/post-job" className="text-slate-600 hover:text-slate-900">
                Post job
              </Link>
              <Link to="/recruiter/login" className="text-slate-500 hover:text-slate-900">
                Account
              </Link>
              {isRecruiter && employerIds.length > 1 && (
                <select
                  aria-label="Organisation"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm"
                  value={employerId ?? ""}
                  onChange={(e) => setEmployerId(e.target.value)}
                >
                  {employerIds.map((id) => (
                    <option key={id} value={id}>
                      {companyNames[id] ?? id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              )}
              {isRecruiter && employerIds.length === 1 && employerId && (
                <span className={cn("text-xs text-slate-500")}>
                  {companyNames[employerId]}
                </span>
              )}
            </nav>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
