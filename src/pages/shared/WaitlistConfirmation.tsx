import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WaitlistConfirmation() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-14 w-14 text-[#3b6ef5]" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold mb-2">You're on the list</h1>
        <p className="text-[#8494b4] text-sm mb-6">
          Thanks for joining the HireFast waitlist. We'll be in touch soon.
        </p>

        <div className="text-left rounded-lg border border-[#1f2d47] bg-[#090d16]/50 p-4 mb-6">
          <p className="text-white font-medium text-sm mb-2">What happens next</p>
          <ul className="text-[#8494b4] text-sm space-y-2 list-disc list-inside">
            <li>We'll email you when we launch in your area</li>
            <li>You'll get early access to jobs or hiring tools</li>
            <li>No spam — only updates that matter</li>
          </ul>
        </div>

        <Link
          to="/"
          className={cn(
            "block w-full py-4 rounded-lg font-medium text-white text-center",
            "bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition"
          )}
        >
          Back to home
        </Link>
        <Link
          to="/recruiters"
          className="mt-3 block text-sm text-[#8494b4] hover:text-white text-center"
        >
          Recruiter? Go to recruiters
        </Link>
      </div>
    </div>
  );
}
