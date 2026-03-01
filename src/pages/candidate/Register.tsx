import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

export default function Register() {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [postcode, setPostcode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostcode(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPostcode = postcode.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPostcode) {
      setError("Please fill in all three fields.");
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem(
        "hirefast_pending_candidate",
        JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          postcode: trimmedPostcode,
        })
      );

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      {/* Minimal header */}
      <header className="border-b border-[#1f2d47] px-4 py-4 md:px-6">
        <Link to="/" className="inline-flex items-center">
          <HireFastLogo size="md" />
        </Link>
      </header>

      <main className="px-4 py-8 md:py-12 flex flex-col items-center">
        {/* Progress: Step 1 of 4 */}
        <div className="w-full max-w-[440px] mb-6">
          <div className="flex gap-1.5">
            <span
              className="h-1.5 flex-1 rounded-full bg-[#3b6ef5]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
          </div>
          <p className="text-[#8494b4] text-xs mt-2">Step 1 of 4</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-[440px] rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6 md:p-8">
          {success ? (
            <div className="text-center py-4">
              <p className="text-white font-medium mb-2">
                Check your email — we&apos;ve sent you a magic link to continue.
              </p>
              <p className="text-[#8494b4] text-sm">
                Click the link in the email to sign in and continue your
                profile.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white md:text-2xl">
                Create your profile
              </h1>
              <p className="text-[#8494b4] text-sm mt-1 mb-6">
                Takes 30 seconds. No CV needed. No password required.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="sr-only">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="postcode" className="sr-only">
                    Postcode
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={handlePostcodeChange}
                    placeholder="e.g. B1 1AA"
                    autoComplete="postal-code"
                    className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5] uppercase"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                        aria-hidden
                      />
                      Sending…
                    </span>
                  ) : (
                    "Send my magic link"
                  )}
                </button>

                {error && (
                  <p
                    className="text-sm text-rose-400"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </form>

              <p className="text-[#8494b4] text-sm mt-6 text-center">
                Already registered? Check your email for your magic link.
              </p>
              <p className="text-center mt-3">
                <Link
                  to="/"
                  className="text-sm text-[#3b6ef5] hover:underline"
                >
                  Back to home
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-[#8494b4] text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#3b6ef5] shrink-0" aria-hidden />
            GDPR Compliant
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[#3b6ef5] shrink-0" aria-hidden />
            No password needed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#3b6ef5] shrink-0" aria-hidden />
            30 second setup
          </span>
        </div>
      </main>
    </div>
  );
}
