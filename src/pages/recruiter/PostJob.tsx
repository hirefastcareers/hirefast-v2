import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Wrench,
  ShoppingBag,
  Heart,
  Car,
  UtensilsCrossed,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import RecruiterLayout from "@/layouts/RecruiterLayout";

type SectorKey =
  | "Logistics/Warehousing"
  | "Engineering/Manufacturing"
  | "Retail"
  | "Care"
  | "Driving"
  | "Hospitality";

const SECTOR_TEMPLATES: Record<
  SectorKey,
  { skills: string[]; shifts: string[] }
> = {
  "Logistics/Warehousing": {
    skills: ["Forklift", "Pick & Pack", "Stock Control", "Manual Handling"],
    shifts: ["Early (6am-2pm)", "Late (2pm-10pm)", "Nights (10pm-6am)"],
  },
  "Engineering/Manufacturing": {
    skills: [
      "Machine Operation",
      "Quality Control",
      "Health & Safety",
      "PPE Compliance",
    ],
    shifts: ["Days (7am-7pm)", "Nights (7pm-7am)", "4-on 4-off"],
  },
  Retail: {
    skills: [
      "Customer Service",
      "Cash Handling",
      "Stock Replenishment",
      "POS Systems",
    ],
    shifts: ["Mornings", "Afternoons", "Weekends", "Flexible"],
  },
  Care: {
    skills: [
      "Personal Care",
      "Manual Handling",
      "Medication Awareness",
      "DBS Required",
    ],
    shifts: ["Days", "Nights", "Waking Nights", "Weekend"],
  },
  Driving: {
    skills: ["Cat C Licence", "Cat C+E Licence", "Tachograph", "CPC Card"],
    shifts: ["Days", "Tramping", "Multi-drop", "Nights"],
  },
  Hospitality: {
    skills: ["Food Hygiene L2", "Bar Work", "Kitchen", "Front of House"],
    shifts: ["Breakfast", "Lunch", "Dinner", "Split Shifts", "Weekends"],
  },
};

const SECTOR_ICONS: Record<SectorKey, typeof Truck> = {
  "Logistics/Warehousing": Truck,
  "Engineering/Manufacturing": Wrench,
  Retail: ShoppingBag,
  Care: Heart,
  Driving: Car,
  Hospitality: UtensilsCrossed,
};

const SECTOR_KEYS: SectorKey[] = [
  "Logistics/Warehousing",
  "Engineering/Manufacturing",
  "Retail",
  "Care",
  "Driving",
  "Hospitality",
];

const DEFAULT_COMMUTE_MINS = 45;

export default function PostJob() {
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>("");
  const [sector, setSector] = useState<SectorKey | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [postcode, setPostcode] = useState<string>("");
  const [payRate, setPayRate] = useState<string>("£");
  const [commuteThresholdMins, setCommuteThresholdMins] =
    useState<number>(DEFAULT_COMMUTE_MINS);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>("");
  const [shiftPatterns, setShiftPatterns] = useState<string[]>([]);
  const [shiftInput, setShiftInput] = useState<string>("");
  const [immediateStart, setImmediateStart] = useState<boolean>(false);
  const [autoRejectLowMatches, setAutoRejectLowMatches] = useState<boolean>(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const applySectorTemplate = useCallback((key: SectorKey) => {
    const t = SECTOR_TEMPLATES[key];
    setRequiredSkills([...t.skills]);
    setShiftPatterns([...t.shifts]);
  }, []);

  useEffect(() => {
    if (sector) applySectorTemplate(sector);
  }, [sector, applySectorTemplate]);

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills((prev) => prev.filter((s) => s !== skill));
  };

  const removeShift = (shift: string) => {
    setShiftPatterns((prev) => prev.filter((s) => s !== shift));
  };

  const addShift = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !shiftPatterns.includes(trimmed)) {
      setShiftPatterns((prev) => [...prev, trimmed]);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a job title.");
      return;
    }
    if (!sector) {
      setError("Please select a sector.");
      return;
    }
    if (!locationName.trim()) {
      setError("Please enter a location name.");
      return;
    }
    if (!postcode.trim()) {
      setError("Please enter a postcode.");
      return;
    }
    if (!payRate.trim()) {
      setError("Please enter a pay rate.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You must be signed in to post a job. Please use your magic link.");
        setLoading(false);
        return;
      }

      const { data: recruiterEmployer, error: lookupError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError || !recruiterEmployer?.employer_id) {
        setError(
          "No employer linked to your account. Please contact support."
        );
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("jobs").insert({
        employer_id: recruiterEmployer.employer_id,
        recruiter_id: user.id,
        title: title.trim(),
        sector,
        location_name: locationName.trim(),
        postcode: postcode.trim(),
        pay_rate: payRate.trim(),
        required_skills: requiredSkills,
        shift_patterns: shiftPatterns,
        commute_threshold_mins: commuteThresholdMins,
        immediate_start: immediateStart,
        auto_reject_low_matches: autoRejectLowMatches,
        is_active: true,
        status: "active",
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setToast("Job posted!");
      setTimeout(() => setToast(null), 4000);
      navigate("/recruiter/applicants");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <RecruiterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-white"
      >
        {/* Toast */}
        {toast && (
        <div
          className="fixed bottom-4 left-4 right-4 z-50 rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-4 py-3 text-sm text-white shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-sm"
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-6 md:p-8 max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f4ff]">Post a Job</h1>
          <p className="mt-1 text-sm text-[#8494b4]">
            Fill in the details below — sector templates do the heavy lifting
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Job Title */}
          <div>
            <label
              htmlFor="post-job-title"
              className="mb-1.5 block text-sm font-medium text-white"
            >
              Job Title
            </label>
            <input
              id="post-job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Forklift Operator"
              className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              autoComplete="off"
            />
          </div>

          {/* 2. Sector — 6 cards in 2-col grid */}
          <div>
            <span className="mb-2 block text-sm font-medium text-white">
              Sector
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SECTOR_KEYS.map((key) => {
                const Icon = SECTOR_ICONS[key];
                const isSelected = sector === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSector(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition",
                      isSelected
                        ? "border-[#3b6ef5] bg-[#3b6ef5]/15 text-white"
                        : "border-[#1f2d47] bg-[#0f1522] text-[#8494b4] hover:border-[#3b6ef5]/40 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Location Name */}
          <div>
            <label
              htmlFor="post-job-location"
              className="mb-1.5 block text-sm font-medium text-white"
            >
              Location Name
            </label>
            <input
              id="post-job-location"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Sheffield City Centre"
              className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              autoComplete="off"
            />
          </div>

          {/* 4. Postcode */}
          <div>
            <label
              htmlFor="post-job-postcode"
              className="mb-1.5 block text-sm font-medium text-white"
            >
              Postcode
            </label>
            <input
              id="post-job-postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="e.g. S1 2AB"
              className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              autoComplete="off"
            />
          </div>

          {/* 5. Pay Rate */}
          <div>
            <label
              htmlFor="post-job-pay"
              className="mb-1.5 block text-sm font-medium text-white"
            >
              Pay Rate
            </label>
            <input
              id="post-job-pay"
              type="text"
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              placeholder="e.g. 12.50/hr or 28,000/yr"
              className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-3 text-white placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              autoComplete="off"
            />
          </div>

          {/* More Options */}
          <div className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522]/50">
            <button
              type="button"
              onClick={() => setMoreOptionsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white"
            >
              More Options
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform", moreOptionsOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {moreOptionsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 border-t border-[#1f2d47] px-4 pb-4 pt-3">
                    {/* Commute threshold */}
                    <div>
                      <label
                        htmlFor="post-job-commute"
                        className="mb-1.5 block text-sm text-[#8494b4]"
                      >
                        Commute threshold (mins)
                      </label>
                      <input
                        id="post-job-commute"
                        type="number"
                        min={5}
                        max={120}
                        value={commuteThresholdMins}
                        onChange={(e) =>
                          setCommuteThresholdMins(
                            Math.min(120, Math.max(5, Number(e.target.value) || 45))
                          )
                        }
                        className="w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-4 py-2 text-white focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                      />
                    </div>

                    {/* Required skills — tag input */}
                    <div>
                      <label className="mb-1.5 block text-sm text-[#8494b4]">
                        Required skills
                      </label>
                      <div className="flex flex-wrap gap-2 rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-3 py-2">
                        {requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-[#1a2438] px-2 py-1 text-sm text-white"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="rounded p-0.5 text-[#6b7fa3] hover:bg-[#243352] hover:text-white"
                              aria-label={`Remove ${skill}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={handleSkillKeyDown}
                          onBlur={() => skillInput.trim() && addSkill(skillInput)}
                          placeholder="Add skill…"
                          className="min-w-[100px] flex-1 bg-transparent py-1 text-white placeholder:text-[#6b7fa3] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Shift patterns — chips with add */}
                    <div>
                      <span className="mb-1.5 block text-sm text-[#8494b4]">
                        Shift patterns
                      </span>
                      <div className="flex flex-wrap gap-2 rounded-[10px] border border-[#1f2d47] bg-[#141d2e] px-3 py-2">
                        {shiftPatterns.map((shift) => (
                          <span
                            key={shift}
                            className="inline-flex items-center gap-1 rounded-md bg-[#1a2438] px-2 py-1 text-sm text-white"
                          >
                            {shift}
                            <button
                              type="button"
                              onClick={() => removeShift(shift)}
                              className="rounded p-0.5 text-[#6b7fa3] hover:bg-[#243352] hover:text-white"
                              aria-label={`Remove ${shift}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={shiftInput}
                          onChange={(e) => setShiftInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addShift(shiftInput);
                              setShiftInput("");
                            }
                          }}
                          onBlur={() => shiftInput.trim() && addShift(shiftInput)}
                          placeholder="Add shift…"
                          className="min-w-[100px] flex-1 bg-transparent py-1 text-white placeholder:text-[#6b7fa3] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Immediate start toggle */}
                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="text-sm text-[#8494b4]">
                        Immediate start
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={immediateStart}
                        onClick={() => setImmediateStart((v) => !v)}
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition",
                          immediateStart ? "bg-[#3b6ef5]" : "bg-[#1a2438]"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition",
                            immediateStart && "translate-x-6"
                          )}
                        />
                      </button>
                    </label>

                    {/* Auto-reject low matches toggle */}
                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="text-sm text-[#8494b4]">
                        Auto-reject low matches
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoRejectLowMatches}
                        onClick={() => setAutoRejectLowMatches((v) => !v)}
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition",
                          autoRejectLowMatches ? "bg-[#3b6ef5]" : "bg-[#1a2438]"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition",
                            autoRejectLowMatches && "translate-x-6"
                          )}
                        />
                      </button>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="rounded-[10px] border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#3b6ef5] py-4 text-lg font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Posting…
              </>
            ) : (
              "Post Job →"
            )}
          </button>
        </form>
      </div>
    </motion.div>
    </RecruiterLayout>
  );
}
