import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import {
  normaliseUkMobile,
  resolvePostcode,
  saveHfLoc,
  type HfLoc,
} from "@/lib/location";
import { skillsForSector } from "@/lib/sector-templates";
import type { Job, RtwStatus } from "@/types";
import { cn } from "@/lib/utils";

type Step = "form" | "success";

interface ApplyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  employerName?: string | null;
  loc: HfLoc | null;
  onLocChange: (loc: HfLoc) => void;
  onApplied: () => void;
  onProfileUpdated: (patch: {
    rtw_status?: RtwStatus;
    skills?: string[];
  }) => void;
}

const RTW_OPTIONS: { value: RtwStatus; label: string }[] = [
  { value: "has_right_to_work", label: "Yes, I can work in the UK" },
  { value: "needs_sponsorship", label: "I'd need visa sponsorship" },
  { value: "unknown", label: "Not sure" },
];

export function ApplyDrawer({
  open,
  onOpenChange,
  job,
  employerName,
  loc,
  onLocChange,
  onApplied,
  onProfileUpdated,
}: ApplyDrawerProps) {
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [postcodeInput, setPostcodeInput] = useState(loc?.partial_postcode ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [rtwStatus, setRtwStatus] = useState<RtwStatus | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [savingExtra, setSavingExtra] = useState(false);
  const startedAt = useRef<number>(0);
  const candidateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      startedAt.current = performance.now();
      setStep("form");
      setError(null);
      setAlreadyApplied(false);
      setEmailMsg(null);
      setRtwStatus(null);
      setSkills([]);
      setPostcodeInput(loc?.partial_postcode ?? "");
    }
  }, [open, loc?.partial_postcode, job?.id]);

  const skillChips = Array.from(
    new Set([...(job?.required_skills ?? []), ...skillsForSector(job?.sector)]),
  );

  async function ensureSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    const { data, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !data.user) {
      throw new Error(
        anonError?.message ??
          "Anonymous sign-in is not enabled. Ask Tom to enable it in Supabase Auth.",
      );
    }
    return data.user;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    setError(null);
    setSubmitting(true);
    try {
      const normalised = normaliseUkMobile(phone);
      if (!normalised) {
        setError("Enter a UK mobile number (07… or +447…).");
        return;
      }
      if (!fullName.trim()) {
        setError("Enter your full name.");
        return;
      }

      const trimmedPc = postcodeInput.trim();
      if (!trimmedPc) {
        setError("Enter your postcode.");
        return;
      }

      let resolved = loc;
      const cleaned = trimmedPc.replace(/\s+/g, "").toUpperCase();
      const samePartial = resolved && cleaned === resolved.partial_postcode.toUpperCase();
      const needsResolve = !resolved || (!samePartial && cleaned.length >= 5);
      if (needsResolve) {
        if (cleaned.length < 5) {
          setError("Enter your full UK postcode so we can place you accurately.");
          return;
        }
        resolved = await resolvePostcode(trimmedPc);
        saveHfLoc(resolved);
        onLocChange(resolved);
      }
      if (!resolved) {
        setError("Enter your full UK postcode.");
        return;
      }

      const user = await ensureSession();
      const duration = Math.round(performance.now() - startedAt.current);

      const upsertPayload = {
        user_id: user.id,
        full_name: fullName.trim(),
        phone: normalised,
        partial_postcode: resolved.partial_postcode,
        loc_lat: resolved.lat,
        loc_lng: resolved.lng,
        updated_at: new Date().toISOString(),
      };

      const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .upsert(upsertPayload, { onConflict: "user_id" })
        .select("id")
        .single();

      if (candError || !candidate) {
        throw new Error(candError?.message ?? "Could not save your profile.");
      }
      candidateIdRef.current = candidate.id;

      const { error: appError } = await supabase.from("applications").insert({
        job_id: job.id,
        employer_id: job.employer_id,
        candidate_id: candidate.id,
        full_name: fullName.trim(),
        phone: normalised,
        status: "applied",
        apply_duration_ms: duration,
      });

      if (appError) {
        if (appError.code === "23505") {
          setAlreadyApplied(true);
          setStep("success");
          onApplied();
          return;
        }
        throw new Error(appError.message);
      }

      setStep("success");
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveExtras(nextRtw?: RtwStatus, nextSkills?: string[]) {
    const id = candidateIdRef.current;
    if (!id) return;
    setSavingExtra(true);
    try {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (nextRtw) patch.rtw_status = nextRtw;
      if (nextSkills) {
        patch.skills = nextSkills;
        patch.candidate_skills = nextSkills;
      }
      const { error: updError } = await supabase
        .from("candidates")
        .update(patch)
        .eq("id", id);
      if (updError) throw updError;
      onProfileUpdated({
        rtw_status: nextRtw,
        skills: nextSkills,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingExtra(false);
    }
  }

  async function handleRtw(value: RtwStatus) {
    setRtwStatus(value);
    await saveExtras(value, undefined);
  }

  async function toggleSkill(skill: string) {
    const next = skills.includes(skill)
      ? skills.filter((s) => s !== skill)
      : [...skills, skill];
    setSkills(next);
    await saveExtras(undefined, next);
  }

  async function handleEmailUpgrade(e: React.FormEvent) {
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
        // Likely email already registered — send magic link instead
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-lg">
        {step === "form" ? (
          <>
            <DrawerHeader>
              <DrawerTitle>Apply in under 15 seconds</DrawerTitle>
              <DrawerDescription>
                {job?.title}
                {employerName ? ` · ${employerName}` : ""}
              </DrawerDescription>
            </DrawerHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-2">
              <div className="space-y-1.5">
                <Label htmlFor="apply-name">Full name</Label>
                <Input
                  id="apply-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apply-phone">Mobile number</Label>
                <Input
                  id="apply-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="07…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apply-postcode">Postcode</Label>
                <Input
                  id="apply-postcode"
                  inputMode="text"
                  autoComplete="postal-code"
                  placeholder="e.g. S35 2YF"
                  value={postcodeInput}
                  onChange={(e) => setPostcodeInput(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white"
                  required
                />
                <p className="text-xs text-slate-500">
                  We only store your outward code (e.g. S35), never your full postcode.
                </p>
              </div>
              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}
              <DrawerFooter className="px-0">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {submitting ? "Submitting…" : "Submit application"}
                  </Button>
                </motion.div>
                <p className="text-center text-xs text-slate-500">
                  By applying you agree to our{" "}
                  <Link to="/terms" className="text-blue-600 underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-blue-600 underline">
                    Privacy
                  </Link>
                  .
                </p>
              </DrawerFooter>
            </form>
          </>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle>
                {alreadyApplied ? "Already applied" : "You're in"}
              </DrawerTitle>
              <DrawerDescription>
                {alreadyApplied
                  ? "We've got your application for this role."
                  : "Optional — sharpen your match (skippable)."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Right to work</h3>
                <div className="grid gap-2">
                  {RTW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => void handleRtw(opt.value)}
                      disabled={savingExtra}
                      className={cn(
                        "min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors active:bg-slate-100",
                        rtwStatus === opt.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-800",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Employers will still carry out official right-to-work checks.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skillChips.map((skill) => {
                    const on = skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => void toggleSkill(skill)}
                        disabled={savingExtra}
                        className={cn(
                          "min-h-10 rounded-xl border px-3 py-2 text-sm capitalize active:bg-slate-100",
                          on
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-700",
                        )}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Get updates on this application
                </h3>
                <form onSubmit={handleEmailUpgrade} className="flex gap-2">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Button type="submit" size="lg" variant="outline" className="h-11 shrink-0 rounded-xl">
                    Send link
                  </Button>
                </form>
                {emailMsg && <p className="text-sm text-slate-600">{emailMsg}</p>}
              </section>

              {error && (
                <p className="text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}

              <Button
                size="lg"
                variant="secondary"
                className="h-12 w-full rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
              <Link
                to="/me/applications"
                className="text-center text-sm text-blue-600 underline"
                onClick={() => onOpenChange(false)}
              >
                View my applications
              </Link>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
