import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { HireFastLogo } from "@/components/ui/HireFastLogo";

const DBS_OPTIONS = [
  "No DBS",
  "Basic DBS",
  "Standard DBS",
  "Enhanced DBS",
] as const;

type DBSStatus = (typeof DBS_OPTIONS)[number];

export default function VerifyIdentity() {
  const navigate = useNavigate();
  const [hasRtw, setHasRtw] = useState<boolean | null>(null);
  const [hasNi, setHasNi] = useState<boolean | null>(null);
  const [dbsStatus, setDbsStatus] = useState<DBSStatus>("No DBS");
  const [phone, setPhone] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hasRtw === null) {
      setError("Please select your Right to Work status.");
      return;
    }
    if (hasNi === null) {
      setError("Please select whether you have a UK National Insurance number.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You must be signed in to continue. Please use your magic link.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          has_rtw: hasRtw,
          ni_confirmed: hasNi,
          dbs_status: dbsStatus,
          phone: phone.trim() || null,
        })
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      navigate("/candidate/shifts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white">
      {/* Header */}
      <header className="border-b border-[#1f2d47] px-4 py-4">
        <Link to="/" className="inline-flex items-center">
          <HireFastLogo size="md" />
        </Link>
      </header>

      <main className="px-4 py-8 flex flex-col items-center">
        {/* Progress bar — Step 2 of 4 */}
        <div className="w-full max-w-[440px] mb-6">
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
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
            <span
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
          </div>
          <p className="text-[#8494b4] text-xs mt-2">Step 2 of 4</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-[440px] rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6">
          <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f4ff]">
            Let&apos;s verify you
          </h1>
          <p className="text-[#8494b4] text-sm mt-1 mb-6">
            This takes 60 seconds. All answers are self-declared — employers can request document verification separately.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1 — Right to Work (Self-Declared) */}
            <div>
              <p className="text-white text-sm font-medium mb-3">
                Right to Work (Self-Declared)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasRtw(true)}
                  className={cn(
                    "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
                    hasRtw === true
                      ? "border-[#3b6ef5] bg-[#3b6ef5] text-white"
                      : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                  )}
                >
                  Yes — I declare I have the right to work in the UK
                </button>
                <button
                  type="button"
                  onClick={() => setHasRtw(false)}
                  className={cn(
                    "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
                    hasRtw === false
                      ? "border-[#f59e0b] bg-[#f59e0b] text-white"
                      : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                  )}
                >
                  No / Not sure
                </button>
              </div>
            </div>

            {/* Section 2 — National Insurance (Self-Declared) */}
            <div>
              <p className="text-white text-sm font-medium mb-3">
                Do you have a UK National Insurance number? (Self-Declared)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasNi(true)}
                  className={cn(
                    "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
                    hasNi === true
                      ? "border-[#3b6ef5] bg-[#3b6ef5] text-white"
                      : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setHasNi(false)}
                  className={cn(
                    "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
                    hasNi === false
                      ? "border-[#f59e0b] bg-[#f59e0b] text-white"
                      : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                  )}
                >
                  No / Not yet
                </button>
              </div>
            </div>

            {/* Section 3 — DBS Check Status (Self-Declared) */}
            <div>
              <p className="text-white text-sm font-medium mb-3">
                DBS Check Status (Self-Declared)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DBS_OPTIONS.map((option) => {
                  const selected = dbsStatus === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDbsStatus(option)}
                      className={cn(
                        "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-sm font-medium transition active:scale-[0.98]",
                        selected
                          ? "border-[#3b6ef5] bg-[#141d2e] text-[#3b6ef5]"
                          : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone number input */}
            <div>
              <label htmlFor="phone" className="sr-only">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 or 07..."
                autoComplete="tel"
                className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                disabled={loading}
              />
            </div>

            {/* Amber disclaimer */}
            <p className="text-amber-400 text-xs text-center">
              ⚠️ All information provided here is self-declared. Employers may request supporting documents before making a hire.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-[10px] font-semibold text-white bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                    aria-hidden
                  />
                  Saving…
                </span>
              ) : (
                "Save and continue"
              )}
            </button>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Below card */}
        <p className="text-[#8494b4] text-xs mt-6 text-center max-w-[440px]">
          Your data is stored securely in line with UK GDPR. Self-declared information is clearly flagged to employers.
        </p>
        <p className="mt-3">
          <Link
            to="/candidate/register"
            className="text-sm text-[#3b6ef5] hover:underline"
          >
            Back
          </Link>
        </p>
      </main>
    </div>
  );
}
