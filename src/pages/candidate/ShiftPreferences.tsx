import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, Bus, PersonStanding, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const ALL_SKILLS = [
  "Forklift",
  "Pick & Pack",
  "Stock Control",
  "Manual Handling",
  "Machine Operation",
  "Quality Control",
  "Health & Safety",
  "PPE Compliance",
  "Customer Service",
  "Cash Handling",
  "Stock Replenishment",
  "POS Systems",
  "Personal Care",
  "Medication Awareness",
  "DBS Required",
  "First Aid",
  "Cat C Licence",
  "Cat C+E Licence",
  "Tachograph",
  "CPC Card",
  "Food Hygiene L2",
  "Bar Work",
  "Kitchen",
  "Front of House",
  "Team Leader",
  "Health & Safety L2",
  "Cleaning",
  "Security",
  "Data Entry",
  "Customer Facing",
  "Lone Working",
];

const SHIFT_OPTIONS = [
  "Early Shifts (6am–2pm)",
  "Late Shifts (2pm–10pm)",
  "Night Shifts (10pm–6am)",
  "Day Shifts (8am–5pm)",
  "Weekends",
  "Flexible / Any",
] as const;

type ShiftOption = (typeof SHIFT_OPTIONS)[number];

const TRANSPORT_OPTIONS = [
  { id: "own_car" as const, label: "Own Car", icon: Car, hasVehicle: true },
  {
    id: "public_transport" as const,
    label: "Public Transport",
    icon: Bus,
    hasVehicle: false,
  },
  {
    id: "either" as const,
    label: "Either / Both",
    icon: PersonStanding,
    hasVehicle: true,
  },
] as const;

const COMMUTE_OPTIONS = [
  "Up to 5 miles",
  "Up to 10 miles",
  "Up to 20 miles",
  "20+ miles / No limit",
] as const;

const COMMUTE_STORAGE_VALUES: Record<(typeof COMMUTE_OPTIONS)[number], string> =
  {
    "Up to 5 miles": "5",
    "Up to 10 miles": "10",
    "Up to 20 miles": "20",
    "20+ miles / No limit": "unlimited",
  };

export default function ShiftPreferences() {
  const navigate = useNavigate();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<ShiftOption[]>([]);
  const [transport, setTransport] = useState<
    "own_car" | "public_transport" | "either" | null
  >(null);
  const [maxCommute, setMaxCommute] = useState<
    (typeof COMMUTE_OPTIONS)[number] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleShift = (option: ShiftOption) => {
    setSelectedShifts((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedShifts.length === 0) {
      setError("Please select at least one shift type.");
      return;
    }
    if (transport === null) {
      setError("Please select how you get to work.");
      return;
    }
    if (maxCommute === null) {
      setError("Please select your maximum commute distance.");
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

      const transportOption = TRANSPORT_OPTIONS.find((t) => t.id === transport);
      const has_vehicle = transportOption?.hasVehicle ?? false;

      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          candidate_skills: selectedSkills,
          availability: selectedShifts,
          transport_mode: transport,
          has_vehicle,
        })
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      const storageValue = COMMUTE_STORAGE_VALUES[maxCommute];
      localStorage.setItem("hirefast_max_commute", storageValue);

      navigate("/candidate/profile-complete");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

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
        {/* Progress bar — Step 3 of 4 */}
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
              className="h-1.5 flex-1 rounded-full bg-[#1a2438]"
              aria-hidden
            />
          </div>
          <p className="text-[#8494b4] text-xs mt-2">Step 3 of 4</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[480px] space-y-4">
          {/* Card 1 — Skills */}
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#3b6ef5]" aria-hidden />
              <h3 className="text-white font-medium">Your Skills</h3>
            </div>
            <p className="text-[#8494b4] text-sm mb-4">
              Select all that apply — this helps us match you to the right roles
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map((skill) => {
                const selected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "min-h-[44px] rounded-[10px] px-4 py-2.5 text-sm font-medium transition active:scale-[0.98]",
                      selected
                        ? "bg-[#3b6ef5] text-white"
                        : "bg-[#1a2438] border border-[#1f2d47] text-[#8494b4] hover:border-[#3b6ef5]/50 hover:text-white"
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2 — Shifts */}
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 mb-4">
            <h3 className="text-white font-medium mb-3">When can you work?</h3>
            <p className="text-[#8494b4] text-sm mb-4">
              Select all that apply. You can update this anytime.
            </p>

            <div className="space-y-6">
              <div>
                <p className="text-white text-sm font-medium mb-3">
                  Available shifts
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {SHIFT_OPTIONS.map((option) => {
                    const selected = selectedShifts.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleShift(option)}
                        className={cn(
                          "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
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

              <div>
                <p className="text-white text-sm font-medium mb-3">
                  How do you get to work?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {TRANSPORT_OPTIONS.map(({ id, label, icon: Icon }) => {
                    const selected = transport === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTransport(id)}
                        className={cn(
                          "flex flex-col items-center gap-2 min-h-[72px] rounded-[10px] border-2 px-3 py-3 text-sm font-medium transition active:scale-[0.98]",
                          selected
                            ? "border-[#3b6ef5] bg-[#141d2e] text-[#3b6ef5]"
                            : "border-[#1f2d47] bg-[#141d2e] text-[#8494b4] hover:border-[#243352] hover:bg-[#1a2438]"
                        )}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden />
                        <span className="text-center leading-tight">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-white text-sm font-medium mb-3">
                  How far will you travel?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {COMMUTE_OPTIONS.map((option) => {
                    const selected = maxCommute === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMaxCommute(option)}
                        className={cn(
                          "min-h-[48px] rounded-[10px] border-2 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
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
            </div>
          </div>

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

        {/* Below card */}
        <p className="text-[#8494b4] text-xs mt-6 text-center max-w-[480px]">
          You can update your preferences at any time from your profile.
        </p>
        <p className="mt-3">
          <Link
            to="/candidate/verify"
            className="text-sm text-[#3b6ef5] hover:underline"
          >
            Back
          </Link>
        </p>
      </main>
    </div>
  );
}
