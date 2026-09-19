import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import RecruiterShell from "@/layouts/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/lib/supabase";
import { resolveSitePostcode } from "@/lib/location";
import {
  SECTOR_TEMPLATES,
  SHIFT_OPTIONS,
  type SectorKey,
  type ShiftOption,
} from "@/lib/sector-templates";

export default function PostJobV2() {
  const { loading: orgLoading, isRecruiter, employerId, userId } = useOrg();
  const navigate = useNavigate();
  const [sector, setSector] = useState<SectorKey | "">("");
  const [title, setTitle] = useState("");
  const [sitePostcode, setSitePostcode] = useState("");
  const [pay, setPay] = useState("");
  const [shift, setShift] = useState<ShiftOption>("Days");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!orgLoading && !isRecruiter) {
    return <Navigate to="/recruiter/login" replace />;
  }

  function onSectorChange(key: SectorKey) {
    setSector(key);
    const t = SECTOR_TEMPLATES[key];
    if (!title.trim() && t.suggestedTitles[0]) {
      setTitle(t.suggestedTitles[0]);
    }
    setShift(t.defaultShift as ShiftOption);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employerId || !userId) return;
    setError(null);
    setSubmitting(true);
    try {
      if (!sector) throw new Error("Choose a sector.");
      if (!title.trim()) throw new Error("Enter a job title.");
      const payNum = Number(pay.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(payNum) || payNum <= 0) {
        throw new Error("Enter pay per hour as a number (e.g. 12.50).");
      }
      const site = await resolveSitePostcode(sitePostcode);
      const template = SECTOR_TEMPLATES[sector];

      const { data, error: insertError } = await supabase
        .from("jobs")
        .insert({
          employer_id: employerId,
          recruiter_id: userId,
          title: title.trim(),
          sector,
          partial_postcode: site.partial_postcode,
          loc_lat: site.lat,
          loc_lng: site.lng,
          location_name: site.partial_postcode,
          pay_rate: `£${payNum.toFixed(2)}/hr`,
          shift_patterns: [shift],
          required_skills: template.requiredSkills,
          max_commute_miles: template.maxCommuteMiles,
          sponsorship_available: false,
          is_published: true,
          is_active: true,
          status: "open",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      navigate(`/recruiter/jobs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post job.");
    } finally {
      setSubmitting(false);
    }
  }

  const suggestions = sector ? SECTOR_TEMPLATES[sector].suggestedTitles : [];

  return (
    <RecruiterShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
          Post a job
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Five fields. Skills, sponsorship and commute limits are editable on the job page afterwards.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <Select
              value={sector}
              onValueChange={(v) => onSectorChange(v as SectorKey)}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Choose sector" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SECTOR_TEMPLATES).map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Job title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTitle(s)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 active:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-pc">Site postcode</Label>
            <Input
              id="site-pc"
              inputMode="text"
              autoComplete="postal-code"
              placeholder="e.g. S9 1XY"
              value={sitePostcode}
              onChange={(e) => setSitePostcode(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay">Pay per hour (£)</Label>
            <Input
              id="pay"
              inputMode="decimal"
              placeholder="12.50"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              className="h-11 rounded-xl tabular-nums"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Shift pattern</Label>
            <Select value={shift} onValueChange={(v) => setShift(v as ShiftOption)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting ? "Publishing…" : "Publish job"}
            </Button>
          </motion.div>
          <p className="text-center text-sm text-slate-500">
            <Link to="/recruiter" className="text-blue-600 underline">
              Back to dashboard
            </Link>
          </p>
        </form>
      </div>
    </RecruiterShell>
  );
}
