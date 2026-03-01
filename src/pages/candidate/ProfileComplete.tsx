import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const SUMMARY_ITEMS = [
  {
    text: "Personal details saved — name, email and postcode confirmed",
  },
  {
    text: "Right to Work declared — self-declared status on file",
  },
  {
    text: "Shift availability set — employers can match you to the right roles",
  },
  {
    text: "Profile created — you're visible to verified UK employers",
  },
] as const;

export default function ProfileComplete() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      {/* Header */}
      <header className="border-b border-[#1f2d47] px-4 py-4">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight inline-block"
        >
          <span className="text-white">Hire</span>
          <span className="text-[#3b6ef5]">Fast</span>
        </Link>
      </header>

      <main className="px-4 py-8 flex flex-col items-center">
        {/* Progress bar — Step 4 of 4 */}
        <div className="w-full max-w-[480px] mb-6">
          <div className="flex gap-1.5">
            <span
              className="h-1.5 flex-1 rounded-full bg-[#3b6ef5]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#3b6ef5]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#3b6ef5]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#3b6ef5]"
              aria-hidden
            />
          </div>
          <p className="text-[#8494b4] text-xs mt-2">Step 4 of 4</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-[480px] rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
          {/* Success icon */}
          <div className="flex justify-center mb-4">
            <CheckCircle
              className="text-[#22c55e] shrink-0"
              size={64}
              strokeWidth={2}
              aria-hidden
            />
          </div>

          <h1 className="text-xl font-bold text-white text-center">
            Your profile is live 🎉
          </h1>
          <p className="text-[#8494b4] text-sm mt-2 mb-6 text-center">
            You're ready to start applying. Here's what you've set up:
          </p>

          {/* Profile summary checklist */}
          <ul className="space-y-3 mb-6">
            {SUMMARY_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <CheckCircle
                  className="text-[#22c55e] shrink-0 mt-0.5"
                  size={20}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="text-sm text-white">{item.text}</span>
              </li>
            ))}
          </ul>

          {/* Profile strength bar */}
          <div className="mb-6">
            <p className="text-[#8494b4] text-xs italic text-center mb-3">
              💡 HireFast works without a CV for warehouse, logistics, and
              production roles. A CV is only useful if you're applying for
              supervisory or specialist positions.
            </p>
            <p className="text-sm font-medium text-white mb-2">
              Profile strength
            </p>
            <div className="h-2 rounded-full bg-[#1a2438] overflow-hidden">
              <div className="h-full w-[60%] rounded-full bg-[#3b6ef5]" />
            </div>
            <p className="text-[#8494b4] text-xs mt-2">
              No CV needed for most roles. For skilled or specialist positions,
              adding one can improve your chances.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center w-full text-center justify-center mt-3 py-2 px-4 rounded-[10px] text-sm font-medium border border-[#1f2d47] text-[#8494b4] hover:border-[#3b6ef5] hover:text-[#3b6ef5] transition"
            >
              Add CV for skilled roles (optional)
            </Link>
          </div>

          {/* Main CTA */}
          <Link
            to="/candidate/jobs"
            className="block w-full py-3.5 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition text-center"
          >
            Browse Available Jobs
          </Link>

        </div>

        {/* Below card */}
        <p className="text-[#8494b4] text-xs mt-6 text-center max-w-[480px]">
          You'll receive job matches by email. No spam — only roles that fit
          your preferences.
        </p>
      </main>
    </div>
  );
}
