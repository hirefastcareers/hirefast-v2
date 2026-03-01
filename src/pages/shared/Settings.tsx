import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  AlertTriangle,
  LogOut,
  Pencil,
  MapPin,
  ExternalLink,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import RecruiterLayout from "@/layouts/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Employer = {
  id: string;
  company_name: string | null;
  industry_sector: string | null;
  location: string | null;
  website: string | null;
  company_description: string | null;
};

function formatDateDDMMYYYY(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 rounded-[14px] border border-[#1f2d47] bg-[#0f1522] overflow-hidden relative"
        >
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"default" | "emerald">("default");

  // Sign out confirmation
  const [signOutConfirm, setSignOutConfirm] = useState<boolean>(false);
  // Deactivate jobs confirmation
  const [deactivateConfirm, setDeactivateConfirm] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  // Delete account
  const [deleteStage, setDeleteStage] = useState<"idle" | "warning">("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

  // Employer edit mode
  const [employerEditing, setEmployerEditing] = useState<boolean>(false);
  const [employerForm, setEmployerForm] = useState<{
    company_name: string;
    industry_sector: string;
    location: string;
    website: string;
    company_description: string;
  }>({
    company_name: "",
    industry_sector: "",
    location: "",
    website: "",
    company_description: "",
  });
  const [employerSaveError, setEmployerSaveError] = useState<string | null>(null);
  const [employerSaving, setEmployerSaving] = useState<boolean>(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          navigate("/recruiter/login", { replace: true });
        }
        return;
      }

      setUserEmail(user.email ?? null);
      setUserCreatedAt(user.created_at ?? null);

      const { data: re, error: reError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (reError || !re?.employer_id) {
        if (!cancelled) setLoading(false);
        return;
      }

      setEmployerId(re.employer_id);

      const { data: emp, error: empError } = await supabase
        .from("employers")
        .select("id, company_name, industry_sector, location, website, company_description")
        .eq("id", re.employer_id)
        .single();

      if (!cancelled) {
        if (empError || !emp) {
          setEmployer(null);
        } else {
          setEmployer(emp as Employer);
          setEmployerForm({
            company_name: emp.company_name ?? "",
            industry_sector: emp.industry_sector ?? "",
            location: emp.location ?? "",
            website: emp.website ?? "",
            company_description: emp.company_description ?? "",
          });
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/recruiter/login", { replace: true });
  };

  const handleDeactivateAllJobs = async () => {
    if (!employerId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setDeactivating(true);
    const { error } = await supabase
      .from("jobs")
      .update({ is_active: false, status: "inactive" })
      .eq("recruiter_id", user.id);

    setDeactivating(false);
    setDeactivateConfirm(false);
    if (error) {
      setToast("Failed to deactivate jobs. Please try again.");
      setToastVariant("default");
    } else {
      setToast("All jobs deactivated");
      setToastVariant("emerald");
    }
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveEmployer = async () => {
    if (!employerId) return;
    setEmployerSaveError(null);
    setEmployerSaving(true);
    const { error } = await supabase
      .from("employers")
      .update({
        company_name: employerForm.company_name || null,
        industry_sector: employerForm.industry_sector || null,
        location: employerForm.location || null,
        website: employerForm.website || null,
        company_description: employerForm.company_description?.slice(0, 300) || null,
      })
      .eq("id", employerId);

    setEmployerSaving(false);
    if (error) {
      setEmployerSaveError(error.message);
    } else if (employer) {
      setEmployer({
        ...employer,
        company_name: employerForm.company_name || null,
        industry_sector: employerForm.industry_sector || null,
        location: employerForm.location || null,
        website: employerForm.website || null,
        company_description: employerForm.company_description?.slice(0, 300) || null,
      });
      setEmployerEditing(false);
    }
  };

  const handleDeleteAccount = () => {
    // TODO: implement full deletion via Supabase Edge Function
    supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const inputClass =
    "w-full bg-[#141d2e] border border-[#1f2d47] rounded-[10px] px-3 py-2 text-[#f0f4ff] text-sm focus:outline-none focus:border-[#3b6ef5]";

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#f0f4ff]">Settings</h1>
          <p className="text-sm text-[#8494b4]">Manage your account and employer profile</p>
        </div>
        <div className="mt-6">
          <SettingsSkeleton />
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-[#f0f4ff]"
      >
        {toast && (
          <div
            className={cn(
              "fixed bottom-4 left-4 right-4 z-50 rounded-[10px] px-4 py-3 text-sm shadow-lg md:left-1/2 md:right-auto md:max-w-sm md:-translate-x-1/2",
              toastVariant === "emerald"
                ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border border-[#1f2d47] bg-[#0f1522] text-[#f0f4ff]"
            )}
            role="status"
          >
            {toast}
          </div>
        )}

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#f0f4ff]">Settings</h1>
          <p className="mt-1 text-sm text-[#8494b4]">
            Manage your account and employer profile
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {/* Section 1 — Account */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-[#8494b4]" />
              <h2 className="font-medium text-[#f0f4ff]">Account</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[#8494b4]">Email</p>
                <p className="font-mono text-sm text-[#f0f4ff]">{userEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-[#8494b4]">Auth method</p>
                <p className="flex items-center gap-1.5 text-sm text-[#f0f4ff]">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Magic Link — Passwordless
                </p>
              </div>
              <div>
                <p className="text-sm text-[#8494b4]">Member since</p>
                <p className="text-sm text-[#f0f4ff]">{formatDateDDMMYYYY(userCreatedAt ?? undefined)}</p>
              </div>
            </div>
            <div className="mt-5">
              {!signOutConfirm ? (
                <Button
                  variant="outline"
                  className="w-full border-[#1f2d47] text-[#f0f4ff] hover:bg-[#1f2d47]"
                  onClick={() => setSignOutConfirm(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-[#8494b4]">Are you sure?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-[#1f2d47] text-[#f0f4ff] hover:bg-[#1f2d47]"
                      onClick={() => setSignOutConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 bg-[#3b6ef5] hover:bg-[#2d5ae0]"
                      onClick={handleSignOut}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Section 2 — Employer Profile */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#8494b4]" />
                <h2 className="font-medium text-[#f0f4ff]">Employer Profile</h2>
              </div>
              {!employerEditing && employer && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#8494b4] hover:text-[#f0f4ff]"
                  onClick={() => setEmployerEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {!employer ? (
              <p className="text-sm text-[#8494b4]">No employer linked to your account.</p>
            ) : employerEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-[#8494b4]">Company Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={employerForm.company_name}
                    onChange={(e) =>
                      setEmployerForm((f) => ({ ...f, company_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#8494b4]">Industry Sector</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={employerForm.industry_sector}
                    onChange={(e) =>
                      setEmployerForm((f) => ({ ...f, industry_sector: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#8494b4]">Location</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={employerForm.location}
                    onChange={(e) =>
                      setEmployerForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#8494b4]">Website</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="https://"
                    value={employerForm.website}
                    onChange={(e) =>
                      setEmployerForm((f) => ({ ...f, website: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#8494b4]">
                    Description (max 300 characters)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    className={inputClass}
                    value={employerForm.company_description}
                    onChange={(e) =>
                      setEmployerForm((f) => ({ ...f, company_description: e.target.value }))
                    }
                  />
                </div>
                {employerSaveError && (
                  <p className="text-sm text-rose-400">{employerSaveError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-[#8494b4] hover:text-[#f0f4ff]"
                    onClick={() => {
                      setEmployerEditing(false);
                      setEmployerSaveError(null);
                      setEmployerForm({
                        company_name: employer.company_name ?? "",
                        industry_sector: employer.industry_sector ?? "",
                        location: employer.location ?? "",
                        website: employer.website ?? "",
                        company_description: employer.company_description ?? "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#3b6ef5] hover:bg-[#2d5ae0]"
                    onClick={handleSaveEmployer}
                    disabled={employerSaving}
                  >
                    {employerSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-[#f0f4ff]">
                  {employer.company_name || "—"}
                </p>
                {employer.industry_sector && (
                  <Badge variant="outline" className="border-[#1f2d47] text-[#8494b4]">
                    {employer.industry_sector}
                  </Badge>
                )}
                {employer.location && (
                  <p className="flex items-center gap-1.5 text-sm text-[#8494b4]">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {employer.location}
                  </p>
                )}
                {employer.website && (
                  <a
                    href={
                      employer.website.startsWith("http")
                        ? employer.website
                        : `https://${employer.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#3b6ef5] hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {employer.website}
                  </a>
                )}
                {employer.company_description && (
                  <div className="mt-2">
                    <p
                      className={cn(
                        "text-sm text-[#8494b4]",
                        !descriptionExpanded && "line-clamp-3"
                      )}
                    >
                      {employer.company_description}
                    </p>
                    {employer.company_description.length > 120 && (
                      <button
                        type="button"
                        className="mt-1 text-sm text-[#3b6ef5] hover:underline"
                        onClick={() => setDescriptionExpanded((e) => !e)}
                      >
                        {descriptionExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Section 3 — Danger Zone */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.25 }}
            className="rounded-[14px] border border-rose-600/30 bg-[#0f1522] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h2 className="font-medium text-rose-400">Danger Zone</h2>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm text-[#8494b4]">
                  Immediately hide all your active jobs from the candidate job board.
                </p>
                {!deactivateConfirm ? (
                  <Button
                    variant="outline"
                    className="border-rose-600/50 text-rose-400 hover:bg-rose-600/10"
                    onClick={() => setDeactivateConfirm(true)}
                  >
                    Deactivate All Jobs
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="text-[#8494b4] hover:text-[#f0f4ff]"
                      onClick={() => setDeactivateConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      className="border-rose-600/50 text-rose-400 hover:bg-rose-600/10"
                      onClick={handleDeactivateAllJobs}
                      disabled={deactivating}
                    >
                      {deactivating ? "Deactivating…" : "Confirm"}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm text-[#8494b4]">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
                {deleteStage === "idle" && (
                  <Button
                    className="bg-rose-600 text-[#f0f4ff] hover:bg-rose-700"
                    onClick={() => setDeleteStage("warning")}
                  >
                    Delete Account
                  </Button>
                )}
                {deleteStage === "warning" && (
                  <div className="rounded-[10px] border border-rose-600/50 bg-rose-600/10 p-4 text-sm text-rose-200">
                    <p className="mb-3">
                      This will permanently delete your employer profile, all jobs, and all
                      applicant data. Type <strong>DELETE</strong> to confirm.
                    </p>
                    <input
                      type="text"
                      className={cn(inputClass, "mb-3")}
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="text-[#8494b4] hover:text-[#f0f4ff]"
                        onClick={() => {
                          setDeleteStage("idle");
                          setDeleteConfirmText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-rose-600 text-[#f0f4ff] hover:bg-rose-700"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE"}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </RecruiterLayout>
  );
}
