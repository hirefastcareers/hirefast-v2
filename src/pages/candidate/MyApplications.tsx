import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { daysSince, formatDate } from "@/lib/format";
import type { ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";

interface AppRow {
  id: string;
  status: ApplicationStatus | string;
  created_at: string;
  status_updated_at: string | null;
  jobs: {
    title: string | null;
    partial_postcode: string | null;
    employers: { company_name: string | null } | null;
  } | null;
}

type LoadState = "loading" | "ready" | "error";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function MyApplications() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setIsAnonymous(false);
        setState("ready");
        return;
      }
      setIsAnonymous(Boolean(user.is_anonymous));

      const { data: cand } = await supabase
        .from("candidates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cand) {
        setRows([]);
        setState("ready");
        return;
      }

      const { data, error: qError } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, status_updated_at, jobs(title, partial_postcode, employers(company_name))",
        )
        .eq("candidate_id", cand.id)
        .order("created_at", { ascending: false });
      if (qError) throw qError;
      setRows((data ?? []) as unknown as AppRow[]);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load applications.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(id: string) {
    const prev = rows;
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, status: "withdrawn" } : row)),
    );
    const { error: updError } = await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("id", id);
    if (updError) {
      setRows(prev);
      setError(updError.message);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    try {
      const { error: updError } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      );
      if (updError) {
        // TODO(HIREFAST_CONTEXT): merge anonymous applications into existing accounts
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (otpError) throw otpError;
        setEmailMsg("Check your inbox to sign in.");
        return;
      }
      setEmailMsg("Check your inbox to confirm your email.");
    } catch (err) {
      setEmailMsg(err instanceof Error ? err.message : "Could not send email.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/">
            <HireFastLogo size="md" />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/jobs" className="text-slate-500 hover:text-slate-900">
              Jobs
            </Link>
            <Link to="/me/applications" className="font-medium text-blue-600">
              My applications
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
          My applications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track status and withdraw if you change your mind.
        </p>

        {isAnonymous && (
          <form
            onSubmit={handleEmail}
            className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="Get updates — your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
            />
            <Button type="submit" size="lg" className="h-11 rounded-xl bg-blue-600 text-white">
              Send magic link
            </Button>
            {emailMsg && <p className="text-sm text-slate-600 sm:basis-full">{emailMsg}</p>}
          </form>
        )}

        {state === "loading" && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-semibold text-rose-800">Something went wrong</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <Button size="lg" className="mt-4 rounded-xl" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        )}

        {state === "ready" && rows.length === 0 && (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex size-[52px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <FileText className="size-6 text-slate-400" />
            </div>
            <h2 className="font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse jobs and apply in under 15 seconds.
            </p>
            <Button asChild size="lg" className="mt-4 rounded-xl bg-blue-600 text-white">
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          </div>
        )}

        {state === "ready" && rows.length > 0 && (
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.map((row) => {
              const waiting = daysSince(row.status_updated_at ?? row.created_at);
              const withdrawn = row.status === "withdrawn";
              return (
                <li key={row.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.jobs?.title ?? "Role"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {row.jobs?.employers?.company_name ?? "Employer"}
                      {row.jobs?.partial_postcode
                        ? ` · ${row.jobs.partial_postcode}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Applied {formatDate(row.created_at)} ·{" "}
                      <span className="tabular-nums">{waiting}</span> day
                      {waiting === 1 ? "" : "s"} since last status change
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium",
                        withdrawn
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : "border-blue-200 bg-blue-50 text-blue-700",
                      )}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    {!withdrawn && row.status !== "hired" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 rounded-xl"
                        onClick={() => void withdraw(row.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
