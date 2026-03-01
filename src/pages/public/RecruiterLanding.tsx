import { Link } from "react-router-dom";
import {
  MapPin,
  FileStack,
  Ghost,
  ShieldCheck,
  Zap,
  MessageCircle,
  ListOrdered,
  Users,
  Sparkles,
  BadgeCheck,
  CreditCard,
} from "lucide-react";

export default function RecruiterLanding() {
  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1624] text-white font-[Inter,system-ui,sans-serif]">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#0f1624] border-b border-[#2a3a5c] sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link to="/recruiters" className="text-xl font-bold tracking-tight md:text-2xl">
            <span className="text-white">Hire</span>
            <span className="text-[#3b6ef5]">Fast</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-[#6b7fa3] hover:text-white transition-colors"
          >
            For Candidates
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 2. Hero Section */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 max-w-4xl">
        <h1 className="text-3xl font-bold leading-tight mb-4 md:text-4xl lg:text-5xl">
          Post a Job in 30 Seconds. Hire in Days.
        </h1>
        <p className="text-[#6b7fa3] text-lg mb-8 max-w-xl md:text-xl">
          Stop wasting hours on job boards. HireFast gives you pre-verified,
          commute-matched candidates before your competitors even finish
          posting.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            to="/recruiter/login"
            className="inline-flex justify-center items-center py-4 px-8 rounded-xl font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition-all text-lg"
          >
            Post your first job free
          </Link>
          <a
            href="#how-it-works"
            onClick={scrollToHowItWorks}
            className="inline-flex justify-center items-center py-4 px-8 rounded-xl font-semibold text-[#3b6ef5] border-2 border-[#3b6ef5] hover:bg-[#3b6ef5]/10 active:scale-[0.98] transition-all text-lg"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* 3. Problem Section */}
      <section className="pb-16">
        <h2 className="text-2xl font-bold text-center mb-8 md:text-3xl">
          Sound familiar?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="rounded-xl border-2 border-red-900/60 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Candidates too far away
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              You shortlist 10 people. 6 can't make the commute. Wasted time for
              everyone.
            </p>
          </div>
          <div className="rounded-xl border-2 border-amber-900/60 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center mb-4">
              <FileStack className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              CV overload for simple roles
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Sifting through 200 CVs to hire a forklift driver. There has to be
              a better way.
            </p>
          </div>
          <div className="rounded-xl border-2 border-red-900/60 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center mb-4">
              <Ghost className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Ghosting on both sides
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Candidates go silent. Recruiters never follow up. The process
              breaks down.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Solution Section */}
      <section className="pb-16">
        <h2 className="text-2xl font-bold text-center mb-8 md:text-3xl">
          HireFast fixes all of it
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="rounded-xl border-2 border-[#3b6ef5]/50 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Commute Risk Scoring
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Every candidate gets a 🟢🟡🔴 reliability score based on real
              distance from the job postcode.
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#3b6ef5]/50 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              No-CV Entry Level Flow
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              For warehouse, logistics and production roles — candidates apply
              in 30 seconds. You get what matters.
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#3b6ef5]/50 bg-[#141f33] p-5 text-left">
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Anti-Ghosting Engine
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Automated interest checks keep candidates warm. Internal flags
              track recruiter response times.
            </p>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section
        id="how-it-works"
        className="pb-16 scroll-mt-20"
      >
        <h2 className="text-2xl font-bold text-center mb-8 md:text-3xl">
          From post to hire in three steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-left relative">
            <span className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-[#3b6ef5] flex items-center justify-center text-white font-bold text-sm">
              1
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4 mt-2">
              <ListOrdered className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Post in 30 seconds
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Choose your sector template. Fill 5 fields. Done. No lengthy
              forms.
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-left relative">
            <span className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-[#3b6ef5] flex items-center justify-center text-white font-bold text-sm">
              2
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4 mt-2">
              <Users className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Get matched candidates
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              AI ranks applicants by commute distance, shift fit, and
              verification status.
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-left relative">
            <span className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-[#3b6ef5] flex items-center justify-center text-white font-bold text-sm">
              3
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4 mt-2">
              <BadgeCheck className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white mb-2">
              Hire with confidence
            </h3>
            <p className="text-[#6b7fa3] text-sm">
              Pre-verified candidates. Right to Work checked. No surprises.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Social Proof Bar */}
      <section className="pb-16">
        <h2 className="text-2xl font-bold text-center mb-8 md:text-3xl">
          Trusted by recruiters across the UK
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-center">
            <p className="text-[#3b6ef5] font-bold text-2xl mb-1">30 Seconds</p>
            <p className="text-[#6b7fa3] text-sm">Average job post time</p>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-center">
            <p className="text-[#3b6ef5] font-bold text-2xl mb-1">72%</p>
            <p className="text-[#6b7fa3] text-sm">
              Reduction in irrelevant applications
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-center">
            <p className="text-[#3b6ef5] font-bold text-2xl mb-1">Same Day</p>
            <p className="text-[#6b7fa3] text-sm">
              Average time to first qualified candidate
            </p>
          </div>
        </div>
      </section>

      {/* 7. Pricing */}
      <section className="pb-16">
        <h2 className="text-2xl font-bold text-center mb-8 md:text-3xl">
          Simple, transparent pricing
        </h2>
        <p className="text-[#6b7fa3] text-center mb-10 max-w-xl mx-auto">
          No per-job fees. One flat price. Built for UK volume hiring.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="rounded-xl border-2 border-[#3b6ef5] bg-[#141f33] p-6 text-left relative">
            <span className="absolute top-4 right-4 text-xs font-medium text-[#3b6ef5] bg-[#3b6ef5]/20 px-2 py-1 rounded">
              Start here
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white text-xl mb-1">Free</h3>
            <p className="text-[#3b6ef5] font-bold text-2xl mb-4">£0</p>
            <ul className="text-[#6b7fa3] text-sm space-y-2">
              <li>1 active job</li>
              <li>30-second apply flow for candidates</li>
              <li>Commute & match scoring</li>
              <li>Applicant management</li>
            </ul>
            <Link
              to="/recruiter/login"
              className="mt-6 inline-flex justify-center w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Post your first job free
            </Link>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white text-xl mb-1">Pro</h3>
            <p className="text-white font-bold text-2xl mb-4 tabular-nums">£49<span className="text-[#6b7fa3] font-normal text-base">/mo</span></p>
            <ul className="text-[#6b7fa3] text-sm space-y-2">
              <li>5–10 active jobs</li>
              <li>Job performance dashboard</li>
              <li>Auto-reject low matches</li>
              <li>Bulk shortlist & re-engagement</li>
              <li>Priority support</li>
            </ul>
            <Link
              to="/recruiter/login"
              className="mt-6 inline-flex justify-center w-full py-3 px-4 rounded-xl font-semibold text-[#3b6ef5] border-2 border-[#3b6ef5] hover:bg-[#3b6ef5]/10 transition-all"
            >
              Get Pro
            </Link>
          </div>
          <div className="rounded-xl border border-[#2a3a5c] bg-[#141f33] p-6 text-left">
            <div className="w-10 h-10 rounded-lg bg-[#3b6ef5]/20 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-[#3b6ef5]" />
            </div>
            <h3 className="font-semibold text-white text-xl mb-1">Agency</h3>
            <p className="text-white font-bold text-2xl mb-4 tabular-nums">£149<span className="text-[#6b7fa3] font-normal text-base">/mo</span></p>
            <ul className="text-[#6b7fa3] text-sm space-y-2">
              <li>25+ active jobs</li>
              <li>Multi-recruiter & branding</li>
              <li>Everything in Pro</li>
              <li>Dedicated support</li>
            </ul>
            <Link
              to="/recruiter/login"
              className="mt-6 inline-flex justify-center w-full py-3 px-4 rounded-xl font-semibold text-[#8494b4] border border-[#2a3a5c] hover:border-[#3b6ef5] hover:text-[#3b6ef5] transition-all"
            >
              Contact for Agency
            </Link>
          </div>
        </div>
      </section>

      {/* 8. CTA Banner */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto rounded-2xl border border-[#2a3a5c] bg-gradient-to-br from-[#0f1624] to-[#1a2744] p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold mb-3 md:text-3xl">
            Post your first job free
          </h2>
          <p className="text-[#6b7fa3] mb-8 max-w-lg mx-auto">
            No credit card required. Candidates apply in 30 seconds. You get matched, verified applicants.
          </p>
          <Link
            to="/recruiter/login"
            className="inline-flex justify-center items-center py-4 px-8 rounded-xl font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition-all text-lg"
          >
            Post your first job free
          </Link>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-8 border-t border-[#2a3a5c]">
        <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
          <Link to="/recruiters" className="text-lg font-bold">
            <span className="text-white">Hire</span>
            <span className="text-[#3b6ef5]">Fast</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-[#6b7fa3]">
            <Link to="/" className="hover:text-white transition-colors">
              For Candidates
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
          <p className="text-sm text-[#6b7fa3] max-w-xs mx-auto sm:mx-0 sm:text-right">
            The UK's fastest route from applicant to hire
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
