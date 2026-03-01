import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "resolving" | "recruiter" | "candidate" | "expired" | "error";

const RESOLVE_TIMEOUT_MS = 3000;

export default function MagicLinkHandler() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("resolving");

  useEffect(() => {
    let expiredTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const resolve = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) {
        setStatus("expired");
        return;
      }

      if (session?.user?.id) {
        const { data: recruiterRows } = await supabase
          .from("recruiter_employers")
          .select("user_id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (!mounted) return;

        if (recruiterRows && recruiterRows.length > 0) {
          setStatus("recruiter");
          navigate("/recruiter/applicants", { replace: true });
        } else {
          const { data: existingCandidate } = await supabase
            .from("candidates")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!mounted) return;

          if (existingCandidate) {
            setStatus("candidate");
            navigate("/candidate/jobs", { replace: true });
          } else {
            const pendingRaw = localStorage.getItem("hirefast_pending_candidate");
            const pending = pendingRaw ? (JSON.parse(pendingRaw) as { full_name?: string; email?: string; postcode?: string }) : {};

            const { error: insertError } = await supabase.from("candidates").insert({
              user_id: session.user.id,
              email: session.user.email ?? pending.email ?? "",
              full_name: pending.full_name ?? "",
              postcode: pending.postcode ?? "",
            });

            if (!mounted) return;

            if (insertError) {
              setStatus("error");
              return;
            }

            localStorage.removeItem("hirefast_pending_candidate");
            setStatus("candidate");
            navigate("/candidate/verify", { replace: true });
          }
        }
        return;
      }

      // No session yet — wait up to 3s for hash to be processed, then show expired
      expiredTimer = setTimeout(() => {
        if (!mounted) return;
        setStatus("expired");
      }, RESOLVE_TIMEOUT_MS);
    };

    resolve();
    return () => {
      mounted = false;
      if (expiredTimer) clearTimeout(expiredTimer);
    };
  }, [navigate]);

  // Resolving: skeleton immediately on mount — never blank. Dark navy theme.
  if (status === "resolving") {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[12px] border border-[#1f2d47] bg-[#0f1522] p-8 flex flex-col items-center gap-6">
          <span className="font-bold text-xl">
            <span className="text-white">Hire</span>
            <span className="text-[#3b6ef5]">Fast</span>
          </span>
          <Loader2 className="h-10 w-10 text-[#3b6ef5] animate-spin" aria-hidden />
          <p className="text-[#8494b4] text-sm">Signing you in...</p>
        </div>
      </div>
    );
  }

  // Expired: show message + button to recruiter login
  if (status === "expired") {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[12px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center">
          <p className="text-white font-medium mb-2">Link expired</p>
          <p className="text-[#8494b4] text-sm mb-6">
            This sign-in link has expired or has already been used. Request a
            new one below.
          </p>
          <Link
            to="/recruiter/login"
            className="inline-block w-full py-3.5 rounded-[10px] font-medium text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition text-center"
          >
            Back to recruiter login
          </Link>
        </div>
      </div>
    );
  }

  // Error: e.g. candidate INSERT failed — retry registration
  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[12px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center">
          <p className="text-white font-medium mb-2">Something went wrong</p>
          <p className="text-[#8494b4] text-sm mb-6">
            We couldn&apos;t complete your sign-in. Your details are still saved — try again below.
          </p>
          <Link
            to="/candidate/register"
            className="inline-block w-full py-3.5 rounded-[10px] font-medium text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition text-center"
          >
            Continue to registration
          </Link>
        </div>
      </div>
    );
  }

  // Redirecting (recruiter or candidate): keep showing spinner until navigate completes
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center px-4">
      <div
        className="h-10 w-10 rounded-full border-2 border-[#3b6ef5] border-t-transparent animate-spin"
        aria-hidden
      />
      <p className="text-[#8494b4] text-sm mt-4">Redirecting…</p>
    </div>
  );
}
