import { useState, useEffect } from "react";
import { Mail, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import RecruiterShell from "@/layouts/RecruiterShell";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SECONDS = 30;

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  async function sendOtp(trimmed: string) {
    return supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await sendOtp(trimmed);
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setSuccessEmail(trimmed);
      setSuccess(true);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !successEmail) return;
    setError(null);
    setLoading(true);
    try {
      const { error: otpError } = await sendOtp(successEmail);
      if (otpError) setError(otpError.message);
      else setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecruiterShell showNav={false}>
      <div className="flex flex-col items-center justify-center py-8">
        <motion.div
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mb-1 flex justify-center">
            <HireFastLogo size="lg" />
          </div>
          <p className="mb-6 text-center text-sm text-slate-500">Recruiter portal</p>

          {success ? (
            <div className="text-center">
              <p className="mb-2 font-medium text-slate-900">Check your inbox</p>
              <p className="mb-2 text-sm text-slate-500">
                We&apos;ve sent a sign-in link to{" "}
                <span className="font-medium text-slate-900">{successEmail}</span>
              </p>
              <p className="mb-6 text-sm text-slate-500">
                Click the link in the email to sign in. No password — ever.
              </p>
              {resendCountdown > 0 ? (
                <p className="text-sm text-slate-500">
                  Resend available in{" "}
                  <span className="tabular-nums">{resendCountdown}</span>s
                </p>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="rounded-xl"
                  disabled={loading}
                  onClick={() => void handleResend()}
                >
                  Resend link
                </Button>
              )}
              {error && (
                <p className="mt-3 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recruiter-email">Work email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="recruiter-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="size-4" />
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </motion.div>
              <p className="text-center text-xs text-slate-500">
                Recruiters must already have an organisation invite.{" "}
                <Link to="/recruiters" className="text-blue-600 underline">
                  Learn more
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </RecruiterShell>
  );
}
