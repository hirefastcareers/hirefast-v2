import { Outlet, Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

export default function CandidateLayout() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      <header className="border-b border-[#1f2d47] bg-[#090d16]/90 backdrop-blur-xl px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <HireFastLogo size="md" />
          </Link>
          <nav className="flex gap-4">
            <Link to="/candidate/jobs" className="text-[#8494b4] hover:text-white text-sm transition-colors">
              Jobs
            </Link>
            <Link to="/candidate/applications" className="text-[#8494b4] hover:text-white text-sm transition-colors">
              Applications
            </Link>
            <Link to="/candidate/ratings" className="text-[#8494b4] hover:text-white text-sm transition-colors">
              Feedback
            </Link>
            <Link to="/settings" className="text-[#8494b4] hover:text-white text-sm transition-colors">
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
