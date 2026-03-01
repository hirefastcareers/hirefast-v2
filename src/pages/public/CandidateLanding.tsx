import { Link } from "react-router-dom";
import {
  MapPin,
  CalendarClock,
  Zap,
  Star,
} from "lucide-react";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

const SECTORS = [
  "Logistics",
  "Warehousing",
  "Engineering",
  "Manufacturing",
  "Retail",
  "Driving",
  "Food Production",
  "Facilities",
];

export default function CandidateLanding() {
  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#090d16] border-b border-[#1f2d47] sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <HireFastLogo size="md" />
          </Link>
          <Link
            to="/recruiters"
            className="text-sm text-[#8494b4] hover:text-white transition-colors"
          >
            For Recruiters
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 2. Hero Section */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 max-w-4xl">
        <h1 className="text-3xl font-bold leading-tight mb-4 md:text-4xl lg:text-5xl">
          Find Your Next Job in 30 Seconds
        </h1>
        <p className="text-[#8494b4] text-lg mb-8 max-w-xl md:text-xl">
          No CV. No password. No lengthy forms. Just tap, apply, and get hired
          faster than anywhere else.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            to="/candidate/jobs"
            className="inline-flex justify-center items-center py-4 px-8 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition-all text-lg"
          >
            Find Jobs Now
          </Link>
          <a
            href="#how-it-works"
            onClick={scrollToHowItWorks}
            className="text-[#8494b4] hover:text-[#3b6ef5] text-sm font-medium transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* 3. Trust Bar */}
      <section className="pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5">
            <p className="text-[#3b6ef5] font-bold text-xl mb-1">30 Seconds</p>
            <p className="text-[#8494b4] text-sm">Average application time</p>
          </div>
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5">
            <p className="text-[#3b6ef5] font-bold text-xl mb-1">
              Zero Passwords
            </p>
            <p className="text-[#8494b4] text-sm">Magic link access only</p>
          </div>
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5">
            <p className="text-[#3b6ef5] font-bold text-xl mb-1">
              Verified Employers
            </p>
            <p className="text-[#8494b4] text-sm">Every role is checked</p>
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section
        id="how-it-works"
        className="py-16 bg-[#0f1522]/50 rounded-[14px]"
      >
        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold mb-10 md:text-3xl">
            Three steps to your next job
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
              <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-[#3b6ef5]" />
              </div>
              <p className="text-[#8494b4] text-sm font-medium mb-1">Step 1</p>
              <h3 className="text-lg font-semibold mb-2">
                Enter your postcode
              </h3>
              <p className="text-[#8494b4] text-sm">
                We find roles within a commutable distance
              </p>
            </div>
            <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
              <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
                <CalendarClock className="w-5 h-5 text-[#3b6ef5]" />
              </div>
              <p className="text-[#8494b4] text-sm font-medium mb-1">Step 2</p>
              <h3 className="text-lg font-semibold mb-2">
                Tell us your availability
              </h3>
              <p className="text-[#8494b4] text-sm">
                Match shifts that actually work for you
              </p>
            </div>
            <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
              <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-[#3b6ef5]" />
              </div>
              <p className="text-[#8494b4] text-sm font-medium mb-1">Step 3</p>
              <h3 className="text-lg font-semibold mb-2">
                Apply in one tap
              </h3>
              <p className="text-[#8494b4] text-sm">
                Magic link sent to your phone. No CV needed for most roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sector Pills */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 md:text-3xl">
            Roles available in
          </h2>
          <div className="flex flex-wrap gap-3">
            {SECTORS.map((sector) => (
              <span
                key={sector}
                className="inline-flex items-center px-4 py-2 rounded-full border border-[#3b6ef5] text-[#8494b4] text-sm font-medium"
              >
                {sector}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Candidate Testimonials */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 md:text-3xl">
            What candidates say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
              <div className="flex gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-[#3b6ef5] text-[#3b6ef5]"
                  />
                ))}
              </div>
              <blockquote className="text-white text-lg mb-4">
                &ldquo;I applied for three jobs on my lunch break. Got a call the
                same afternoon.&rdquo;
              </blockquote>
              <p className="text-[#8494b4] text-sm">
                — Jamie, Forklift Operator, Birmingham
              </p>
            </div>
            <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
              <div className="flex gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-[#3b6ef5] text-[#3b6ef5]"
                  />
                ))}
              </div>
              <blockquote className="text-white text-lg mb-4">
                &ldquo;Every other job site made me fill in my whole work
                history for a warehouse job. This took 30 seconds.&rdquo;
              </blockquote>
              <p className="text-[#8494b4] text-sm">
                — Priya, Production Operative, Coventry
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA Banner */}
      <section className="py-16 bg-[#090d16] bg-gradient-to-b from-[#0f1522] to-[#090d16] rounded-[14px]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 md:text-3xl lg:text-4xl">
            Ready to find work faster?
          </h2>
          <Link
            to="/candidate/register"
            className="inline-flex justify-center items-center py-4 px-8 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition-all text-lg"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-8 border-t border-[#1f2d47]">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="flex items-center self-start sm:self-auto"
          >
            <HireFastLogo size="sm" />
          </Link>
          <div className="flex flex-wrap gap-6 text-sm text-[#8494b4]">
            <Link to="/recruiters" className="hover:text-white transition-colors">
              For Recruiters
            </Link>
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
          <p className="text-[#8494b4] text-sm self-start sm:self-auto">
            Built for UK workers
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
