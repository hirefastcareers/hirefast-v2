import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { PlusCircle, Users, Star, Settings2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/recruiter/post-job", label: "Post Job", icon: PlusCircle },
  { to: "/recruiter/applicants", label: "Applicants", icon: Users },
  { to: "/recruiter/ratings", label: "Ratings", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

type RecruiterLayoutProps = {
  children?: React.ReactNode;
  title?: string;
  showNav?: boolean;
};

export default function RecruiterLayout({
  children,
  title,
  showNav,
}: RecruiterLayoutProps) {
  const location = useLocation();
  const effectiveShowNav =
    showNav !== undefined
      ? showNav
      : location.pathname !== "/recruiter/login";
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      {effectiveShowNav && (
        <header className="w-full border-b border-[#1f2d47] bg-[#090d16]/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              to="/recruiter/applicants"
              className="flex items-center font-bold text-lg tracking-tight"
            >
              <span className="text-white">Hire</span>
              <span className="text-[#3b6ef5]">Fast</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                const active =
                  to === "/recruiter/applicants"
                    ? location.pathname === "/recruiter/applicants" ||
                      location.pathname.startsWith("/recruiter/candidate/")
                    : location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-sm font-medium transition",
                      active
                        ? "text-[#3b6ef5]"
                        : "text-[#8494b4] hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile: hamburger */}
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-white md:hidden"
              aria-expanded={mobileNavOpen}
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Mobile nav dropdown */}
          {mobileNavOpen && (
            <nav className="border-t border-[#1f2d47] px-4 py-3 md:hidden">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                  const active =
                    to === "/recruiter/applicants"
                      ? location.pathname === "/recruiter/applicants" ||
                        location.pathname.startsWith("/recruiter/candidate/")
                      : location.pathname === to;
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm font-medium transition",
                          active
                            ? "bg-[#3b6ef5]/15 text-[#3b6ef5]"
                            : "text-[#8494b4] hover:bg-[#1a2438] hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </header>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {title && (
          <h1 className="mb-6 text-2xl font-bold text-white">{title}</h1>
        )}
        {content}
      </main>
    </div>
  );
}
