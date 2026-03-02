import { useState, useEffect } from "react";
import { Mail, Send } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import RecruiterLayout from "@/layouts/RecruiterLayout";
import { HireFastLogo } from '@/components/ui/HireFastLogo'

const RESEND_COOLDOWN_SECONDS = 30;

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [successEmail, setSuccessEmail] = useState<string>("");
  const [resendCountdown, setResendCountdown] = useState<number>(0);

  // Countdown for "Resend link" button
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (otpError) {
        setError(otpError.message);
        setLoading(false);
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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: successEmail,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (otpError) setError(otpError.message);
      else setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecruiterLayout showNav={false}>
      <div className="flex flex-col items-center justify-center py-8">
        <motion.div
        className="w-full max-w-md rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6 md:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Wordmark */}
        <div className="flex justify-center mb-1">
          <HireFastLogo size="lg" />
        </div>
        <p className="text-[#8494b4] text-sm text-center mb-6">
          Recruiter Portal
        </p>

        {success ? (
          <div className="text-center">
            <p className="text-[#f0f4ff] font-medium mb-2">Check your inbox</p>
            <p className="text-[#8494b4] text-sm mb-2">
              We&apos;ve sent a sign-in link to{" "}
              <span className="text-[#f0f4ff] font-medium">{successEmail}</span>
            </p>
            <p className="text-[#8494b4] text-sm mb-6">
              Click the link in the email to sign in to the recruiter dashboard.
            </p>
            {resendCountdown > 0 ? (
              <p className="text-[#8494b4] text-sm">
                Resend link available in {resendCountdown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full py-3 rounded-[10px] font-medium text-[#3b6ef5] border border-[#3b6ef5] hover:bg-[#3b6ef5]/10 active:scale-[0.98] transition disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border-2 border-[#3b6ef5] border-t-transparent animate-spin shrink-0"
                      aria-hidden
                    />
                    Sending…
                  </span>
                ) : (
                  "Resend link"
                )}
              </button>
            )}
            {error && (
              <p className="text-sm text-red-400 mt-3" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="recruiter-email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4d5f7a] pointer-events-none"
                    aria-hidden
                  />
                  <input
                    id="recruiter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] pl-12 pr-4 py-3.5 text-[#f0f4ff] placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]/20"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400 mt-2" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:bg-[#4d7ef6] active:scale-[0.98] transition disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <span
                      className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"
                      aria-hidden
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" aria-hidden />
                    Send Magic Link
                  </>
                )}
              </button>
            </form>
            <p className="text-[#8494b4] text-sm text-center mt-6">
              No password needed. We&apos;ll email you a secure sign-in link.
            </p>
          </>
        )}
        </motion.div>
      </div>
    </RecruiterLayout>
  );
}
