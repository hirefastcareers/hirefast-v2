import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  CheckCircle,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// ——— Types ———
type RatingRow = {
  id: string;
  job_id: string;
  recruiter_id: string;
  candidate_id: string;
  rated_by: "recruiter" | "candidate";
  score: number;
  comment: string | null;
  created_at: string;
};

type ApplicationWithJob = {
  id: string;
  job_id: string;
  status: string;
  job_title: string | null;
  recruiter_id: string | null;
  company_name: string | null;
};

// ——— StarRating ———
interface StarRatingProps {
  value: number;
  onChange?: (score: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

function StarRating({ value, onChange, readOnly, size = "md" }: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const displayValue = readOnly ? Math.round(value) : value;
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-7 h-7";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled =
          readOnly
            ? star <= displayValue
            : star <= (hoverIndex ?? displayValue);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            className={`${sizeClass} shrink-0 rounded p-0.5 transition-colors ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } ${filled ? "text-amber-400" : "text-[#1a2438]"}`}
            onMouseEnter={() => !readOnly && setHoverIndex(star)}
            onMouseLeave={() => !readOnly && setHoverIndex(null)}
            onClick={() => !readOnly && onChange?.(star)}
            aria-label={readOnly ? `${displayValue} stars` : `Rate ${star} stars`}
          >
            <Star
              className={sizeClass}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function SkeletonCard() {
  return (
    <div
      className="h-32 rounded-[14px] border border-[#1f2d47] bg-[#0f1522] overflow-hidden relative"
      role="presentation"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function CandidateRatings() {
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [applicationsAwaiting, setApplicationsAwaiting] = useState<ApplicationWithJob[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<RatingRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (candError || !candidate?.id) {
        setLoading(false);
        return;
      }
      setCandidateId(candidate.id);

      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, job_id, status")
        .eq("candidate_id", candidate.id)
        .in("status", ["shortlisted", "rejected"]);

      if (appsError || !appsData?.length) {
        const { data: givenData } = await supabase
          .from("ratings")
          .select("*")
          .eq("candidate_id", candidate.id)
          .eq("rated_by", "candidate");
        const given: RatingRow[] = (givenData ?? []).map((r) => ({
          ...r,
          score: Number(r.score),
        }));
        setRatingsGiven(given);
        setApplicationsAwaiting([]);
        setLoading(false);
        return;
      }

      const jobIds = [...new Set(appsData.map((a) => a.job_id))];
      const { data: givenData } = await supabase
        .from("ratings")
        .select("*")
        .eq("candidate_id", candidate.id)
        .eq("rated_by", "candidate");

      const given: RatingRow[] = (givenData ?? []).map((r) => ({
        ...r,
        score: Number(r.score),
      }));
      setRatingsGiven(given);

      const ratedJobIds = new Set(given.map((r) => r.job_id));
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, recruiter_id, employer_id")
        .in("id", jobIds);

      const employerIds = [
        ...new Set(
          (jobsData ?? [])
            .map((j) => (j as { employer_id?: string }).employer_id)
            .filter(Boolean)
        ),
      ] as string[];
      const { data: employersData } =
        employerIds.length > 0
          ? await supabase
              .from("employers")
              .select("id, company_name")
              .in("id", employerIds)
          : { data: [] as { id: string; company_name: string | null }[] | null };

      const jobInfoMap = new Map(
        (jobsData ?? []).map((j) => [
          j.id,
          {
            title: j.title ?? null,
            recruiter_id: j.recruiter_id ?? null,
            employer_id: (j as { employer_id?: string }).employer_id,
          },
        ])
      );
      const employerMap = new Map(
        (employersData ?? []).map((e) => [e.id, e.company_name ?? null])
      );

      const awaiting: ApplicationWithJob[] = appsData
        .filter((a) => !ratedJobIds.has(a.job_id))
        .map((a) => {
          const info = jobInfoMap.get(a.job_id);
          const company =
            info?.employer_id != null
              ? employerMap.get(info.employer_id) ?? null
              : null;
          return {
            id: a.id,
            job_id: a.job_id,
            status: a.status,
            job_title: info?.title ?? null,
            recruiter_id: info?.recruiter_id ?? null,
            company_name: company,
          };
        });

      if (!cancelled) {
        setApplicationsAwaiting(awaiting);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
        {toast && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-4 py-3 text-sm text-[#f0f4ff] shadow-lg md:left-1/2 md:right-auto md:max-w-sm md:-translate-x-1/2"
            role="status"
          >
            {toast}
          </div>
        )}

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f0f4ff]">
            Your feedback
          </h1>
          <p className="mt-1 text-sm text-[#8494b4]">
            Rate your experience with recruiters after an outcome
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
              <p className="text-xs font-medium uppercase tracking-wider text-[#8494b4]">
                Pending
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#1a2438]" />
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <Briefcase className="h-6 w-6 shrink-0 text-[#3b6ef5]" />
                  <span className="text-2xl font-bold tabular-nums font-mono text-[#f0f4ff]">
                    {applicationsAwaiting.length}
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-[#8494b4]">to rate</p>
            </div>
            <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
              <p className="text-xs font-medium uppercase tracking-wider text-[#8494b4]">
                Rated
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#1a2438]" />
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <Star className="h-6 w-6 shrink-0 text-amber-400" />
                  <span className="text-2xl font-bold tabular-nums font-mono text-[#f0f4ff]">
                    {ratingsGiven.length}
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-[#8494b4]">submitted</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="rate" className="mt-6 w-full">
          <TabsList className="h-auto w-full rounded-[10px] border border-[#1f2d47] bg-[#090d16] p-1">
            <TabsTrigger
              value="rate"
              className="flex-1 rounded-[8px] text-sm text-[#8494b4] transition-all duration-200 data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Star className="mr-1.5 h-4 w-4" />
              Rate experience
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-[8px] text-sm text-[#8494b4] transition-all duration-200 data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Your ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rate" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : applicationsAwaiting.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[14px] border border-[#1f2d47] bg-[#0f1522] py-12 text-center">
                <CheckCircle className="mb-3 h-12 w-12 text-emerald-400" />
                <p className="font-semibold text-[#f0f4ff]">All done</p>
                <p className="mt-1 text-sm text-[#8494b4]">
                  No applications waiting for your rating
                </p>
              </div>
            ) : (
              <RateExperienceList
                applications={applicationsAwaiting}
                candidateId={candidateId}
                onRated={(applicationId, newRating) => {
                  setApplicationsAwaiting((prev) =>
                    prev.filter((a) => a.id !== applicationId)
                  );
                  if (newRating) {
                    setRatingsGiven((prev) => [...prev, newRating]);
                  }
                  showToast("Rating submitted");
                }}
                onError={showToast}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <RatingsHistoryTab ratings={ratingsGiven} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
  );
}

// ——— Rate experience list & card ———
type RateExperienceListProps = {
  applications: ApplicationWithJob[];
  candidateId: string | null;
  onRated: (applicationId: string, newRating?: RatingRow) => void;
  onError: (message: string) => void;
};

function RateExperienceList({
  applications,
  candidateId,
  onRated,
  onError,
}: RateExperienceListProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {applications.map((app, index) => (
          <RateExperienceCard
            key={app.id}
            application={app}
            index={index}
            candidateId={candidateId}
            onRated={onRated}
            onError={onError}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function RateExperienceCard({
  application,
  index,
  candidateId,
  onRated,
  onError,
}: {
  application: ApplicationWithJob;
  index: number;
  candidateId: string | null;
  onRated: (applicationId: string, newRating?: RatingRow) => void;
  onError: (message: string) => void;
}) {
  const [score, setScore] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (score === 0 || !candidateId || !application.recruiter_id) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data: inserted, error } = await supabase
      .from("ratings")
      .insert({
        job_id: application.job_id,
        recruiter_id: application.recruiter_id,
        candidate_id: candidateId,
        rated_by: "candidate",
        score,
        comment: comment.trim() || null,
      })
      .select("id, job_id, recruiter_id, candidate_id, rated_by, score, comment, created_at")
      .single();

    if (error) {
      setSubmitError(error.message);
      onError(error.message);
      setSubmitting(false);
      return;
    }
    const newRating: RatingRow = {
      ...inserted,
      score: Number(inserted.score),
    };
    onRated(application.id, newRating);
    setSubmitting(false);
  };

  const statusBadgeClass =
    application.status === "shortlisted"
      ? "border-[#3b6ef5]/25 bg-[#3b6ef5]/10 text-[#3b6ef5]"
      : "border-rose-500/25 bg-rose-500/10 text-rose-400";
  const statusLabel = application.status === "shortlisted" ? "Shortlisted" : "Rejected";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight text-[#f0f4ff] truncate">
            {application.job_title || "Job"}
          </p>
          {application.company_name && (
            <p className="mt-0.5 text-sm text-[#8494b4] truncate">
              {application.company_name}
            </p>
          )}
        </div>
        <Badge variant="outline" className={statusBadgeClass}>
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs text-[#8494b4]">Your rating</p>
        <StarRating value={score} onChange={setScore} size="md" />
      </div>

      <div className="mt-2">
        {!showComment ? (
          <button
            type="button"
            onClick={() => setShowComment(true)}
            className="text-xs text-[#3b6ef5] hover:underline cursor-pointer"
          >
            + Add a note
          </button>
        ) : (
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Optional note about your experience..."
              maxLength={200}
              className="mt-1 w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] p-3 text-sm text-[#f0f4ff] placeholder:text-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-[#4d5f7a]">
              {comment.length}/200
            </p>
          </div>
        )}
      </div>

      <Button
        className="mt-3 w-full rounded-[10px] bg-[#3b6ef5] font-semibold text-white hover:bg-[#4d7ef6] active:scale-[0.98] transition-transform"
        disabled={score === 0 || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit rating"
        )}
      </Button>
      {submitError && (
        <p className="mt-2 text-sm text-rose-400">{submitError}</p>
      )}
    </motion.div>
  );
}

// ——— Your ratings history ———
function RatingsHistoryTab({
  ratings,
  loading,
}: {
  ratings: RatingRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (ratings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-[#1f2d47] bg-[#0f1522] py-12 text-center">
        <MessageSquare className="mb-3 h-12 w-12 text-[#1a2438]" />
        <p className="font-semibold text-[#f0f4ff]">No ratings yet</p>
        <p className="mt-1 text-sm text-[#8494b4]">
          Your submitted ratings will appear here
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {ratings.map((r) => (
        <div
          key={r.id}
          className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <StarRating value={r.score} readOnly size="sm" />
            <span className="text-xs text-[#4d5f7a] font-mono tabular-nums">
              {formatDate(r.created_at)}
            </span>
          </div>
          {r.comment && (
            <p className="mt-2 text-sm text-[#8494b4]">{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
