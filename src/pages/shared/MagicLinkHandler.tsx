import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";

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
          navigate("/recruiter", { replace: true });
        } else {
          const { data: existingCandidate } = await supabase
            .from("candidates")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!mounted) return;

          if (existingCandidate) {
            setStatus("candidate");
            navigate("/jobs", { replace: true });
          } else {
            const pendingRaw = localStorage.getItem("hirefast_pending_candidate");
            const pending = pendingRaw
              ? (JSON.parse(pendingRaw) as {
                  full_name?: string;
                  email?: string;
                  partial_postcode?: string;
                  postcode?: string;
                })
              : {};

            const rawPc = (pending.partial_postcode ?? pending.postcode ?? "")
              .replace(/\s+/g, "")
              .toUpperCase();
            const partial =
              rawPc.length >= 5
                ? rawPc.slice(0, Math.max(rawPc.length - 3, 0))
                : rawPc || null;

            const { error: insertError } = await supabase.from("candidates").insert({
              user_id: session.user.id,
              email: session.user.email ?? pending.email ?? "",
              full_name: pending.full_name ?? "",
              partial_postcode: partial,
            });

            if (!mounted) return;

            if (insertError) {
              setStatus("error");
              return;
            }

            localStorage.removeItem("hirefast_pending_candidate");
            setStatus("candidate");
            navigate("/jobs", { replace: true });
          }
        }
        return;
      }

      expiredTimer = setTimeout(() => {
        if (!mounted) return;
        setStatus("expired");
      }, RESOLVE_TIMEOUT_MS);
    };

    void resolve();
    return () => {
      mounted = false;
      if (expiredTimer) clearTimeout(expiredTimer);
    };
  }, [navigate]);

  if (status === "resolving") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <HireFastLogo size="md" />
          <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
          <p className="text-sm text-slate-500">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 font-medium text-slate-900">Link expired</p>
          <p className="mb-6 text-sm text-slate-500">
            This sign-in link has expired or has already been used. Request a new one below.
          </p>
          <Button asChild size="lg" className="w-full rounded-xl bg-blue-600 text-white">
            <Link to="/recruiter/login">Back to recruiter login</Link>
          </Button>
          <Link to="/jobs" className="mt-3 block text-sm text-blue-600">
            Browse jobs
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 font-medium text-slate-900">Something went wrong</p>
          <p className="mb-6 text-sm text-slate-500">
            We couldn&apos;t complete your sign-in. Try browsing jobs and applying again.
          </p>
          <Button asChild size="lg" className="w-full rounded-xl bg-blue-600 text-white">
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div
        className="size-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        aria-hidden
      />
      <p className="mt-4 text-sm text-slate-500">Redirecting…</p>
    </div>
  );
}
