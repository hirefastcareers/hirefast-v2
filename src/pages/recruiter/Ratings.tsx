import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  UserCheck,
  CheckCircle,
  Loader2,
} from "lucide-react";
import RecruiterLayout from "@/layouts/RecruiterLayout";
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
  employer_id: string;
  candidate_id: string;
  full_name: string | null;
  status: string;
  created_at: string;
  job_title: string | null;
};

// ——— StarRating (inline) ———
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

// DD/MM/YYYY UK format
function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ——— Skeleton ———
function SkeletonCard() {
  return (
    <div
      className="h-32 rounded-[14px] border border-[#1f2d47] bg-[#0f1522] animate-pulse"
      role="presentation"
    />
  );
}

export default function Ratings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [_employerId, setEmployerId] = useState<string | null>(null);
  const [ratingsGiven, setRatingsGiven] = useState<RatingRow[]>([]);
  const [ratingsReceived, setRatingsReceived] = useState<RatingRow[]>([]);
  const [applicationsAwaiting, setApplicationsAwaiting] = useState<ApplicationWithJob[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data
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

      const { data: recruiterEmployer, error: lookupError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError || !recruiterEmployer?.employer_id) {
        setLoading(false);
        return;
      }

      setEmployerId(recruiterEmployer.employer_id);

      const [givenRes, receivedRes, appsRes] = await Promise.all([
        supabase
          .from("ratings")
          .select("*")
          .eq("recruiter_id", user.id)
          .eq("rated_by", "recruiter"),
        supabase
          .from("ratings")
          .select("*")
          .eq("recruiter_id", user.id)
          .eq("rated_by", "candidate"),
        supabase
          .from("applications")
          .select("id, job_id, employer_id, candidate_id, full_name, status, created_at")
          .eq("employer_id", recruiterEmployer.employer_id)
          .in("status", ["shortlisted", "rejected"]),
      ]);

      if (cancelled) return;

      const given: RatingRow[] = (givenRes.data ?? []).map((r) => ({
        ...r,
        score: Number(r.score),
      }));
      const received: RatingRow[] = (receivedRes.data ?? []).map((r) => ({
        ...r,
        score: Number(r.score),
      }));

      setRatingsGiven(given);
      setRatingsReceived(received);

      const appIds = (appsRes.data ?? []).map((a) => a.id);
      if (appIds.length === 0) {
        setApplicationsAwaiting([]);
        setLoading(false);
        return;
      }

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title")
        .in(
          "id",
          (appsRes.data ?? []).map((a) => a.job_id)
        );

      const jobTitleByJobId = new Map(
        (jobsData ?? []).map((j) => [j.id, j.title ?? null])
      );

      const ratedPairs = new Set(
        given.map((r) => `${r.candidate_id}:${r.job_id}`)
      );

      const awaiting: ApplicationWithJob[] = (appsRes.data ?? [])
        .filter(
          (a) => !ratedPairs.has(`${a.candidate_id}:${a.job_id}`)
        )
        .map((a) => ({
          ...a,
          job_title: jobTitleByJobId.get(a.job_id) ?? null,
        }));

      setApplicationsAwaiting(awaiting);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const avgScore =
    ratingsReceived.length > 0
      ? ratingsReceived.reduce((s, r) => s + r.score, 0) / ratingsReceived.length
      : 0;
  const displayAvg = Math.round(avgScore * 10) / 10;

  return (
    <RecruiterLayout>
      {toast && (
        <div
          className="fixed bottom-4 left-4 right-4 z-50 rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-4 py-3 text-sm text-white shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-sm"
          role="status"
        >
          {toast}
        </div>
      )}

      <header>
        <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f4ff]">Ratings</h1>
        <p className="mt-1 text-sm text-[#6b7fa3]">
          Rate candidates and view your recruiter reputation
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8494b4]">
              Your Reputation
            </p>
            {loading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-[#1a2438]" />
            ) : ratingsReceived.length === 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <Star className="h-5 w-5 shrink-0 text-[#1a2438]" />
                <span className="text-sm text-[#8494b4]">No ratings yet</span>
              </div>
            ) : (
              <>
                <div className="mt-2">
                  <StarRating value={displayAvg} readOnly size="sm" />
                </div>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-white">
                  {displayAvg.toFixed(1)} / 5
                </p>
                <p className="text-xs text-[#8494b4]">
                  {ratingsReceived.length} rating
                  {ratingsReceived.length !== 1 ? "s" : ""} from candidates
                </p>
              </>
            )}
          </div>
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#8494b4]">
              Ratings Given
            </p>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#1a2438]" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <UserCheck className="h-6 w-6 shrink-0 text-[#3b6ef5]" />
                <span className="text-2xl font-bold font-mono tabular-nums text-white">
                  {ratingsGiven.length}
                </span>
              </div>
            )}
            <p className="mt-1 text-xs text-[#8494b4]">candidates rated</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="rate" className="mt-6 w-full">
        <TabsList className="w-full border border-[#1f2d47] bg-[#090d16] rounded-[10px] p-1 h-auto">
          <TabsTrigger
            value="rate"
            className="flex-1 rounded-[8px] text-sm text-[#8494b4] data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Star className="h-4 w-4 mr-1.5" />
            Rate Candidates
          </TabsTrigger>
          <TabsTrigger
            value="reputation"
            className="flex-1 rounded-[8px] text-sm text-[#8494b4] data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Reputation
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
              <p className="font-medium text-white">All caught up!</p>
              <p className="mt-1 text-sm text-[#8494b4]">
                No candidates waiting to be rated
              </p>
            </div>
          ) : (
            <RateCandidatesList
              applications={applicationsAwaiting}
              onRated={(applicationId, newRating) => {
                setApplicationsAwaiting((prev) =>
                  prev.filter((a) => a.id !== applicationId)
                );
                if (newRating)
                  setRatingsGiven((prev) => [...prev, newRating]);
                showToast("Rating submitted");
              }}
              onError={(msg) => showToast(msg)}
            />
          )}
        </TabsContent>

        <TabsContent value="reputation" className="mt-4">
          <ReputationTab ratingsReceived={ratingsReceived} loading={loading} />
        </TabsContent>
      </Tabs>
    </RecruiterLayout>
  );
}

// ——— Tab 1: Rate candidates list ———
type RateCandidatesListProps = {
  applications: ApplicationWithJob[];
  onRated: (applicationId: string, newRating?: RatingRow) => void;
  onError: (message: string) => void;
};

function RateCandidatesList({
  applications,
  onRated,
  onError,
}: RateCandidatesListProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {applications.map((app, index) => (
          <RateCandidateCard
            key={app.id}
            application={app}
            index={index}
            onRated={onRated}
            onError={onError}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function RateCandidateCard({
  application,
  index,
  onRated,
  onError: _onError,
}: {
  application: ApplicationWithJob;
  index: number;
  onRated: (applicationId: string, newRating?: RatingRow) => void;
  onError: (message: string) => void;
}) {
  const [score, setScore] = useState<number>(0);
  const [showComment, setShowComment] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setSubmitError("Session expired. Please refresh.");
      setSubmitting(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("ratings")
      .insert({
        job_id: application.job_id,
        recruiter_id: user.id,
        candidate_id: application.candidate_id,
        rated_by: "recruiter",
        score,
        comment: comment.trim() || null,
      })
      .select("id, job_id, recruiter_id, candidate_id, rated_by, score, comment, created_at")
      .single();

    if (error) {
      setSubmitError(error.message);
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
      }}
      className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3b6ef5]/20 text-sm font-bold text-[#3b6ef5]"
            aria-hidden
          >
            {getInitials(application.full_name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">
              {application.full_name || "Candidate"}
            </p>
            <p className="text-sm text-[#8494b4] truncate">
              {application.job_title || "Job"}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            application.status === "shortlisted"
              ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
              : "border-rose-500/50 text-rose-400 bg-rose-500/10"
          }
        >
          {application.status === "shortlisted" ? "Shortlisted" : "Rejected"}
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
            className="text-xs text-[#3b6ef5] cursor-pointer hover:underline"
          >
            + Add a note
          </button>
        ) : (
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Optional note about this candidate..."
              maxLength={200}
              className="mt-1 w-full rounded-[10px] border border-[#1f2d47] bg-[#141d2e] p-3 text-sm text-white placeholder-[#4d5f7a] focus:border-[#3b6ef5] focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-[#4d5f7a]">
              {comment.length}/200
            </p>
          </div>
        )}
      </div>

      <Button
        className="mt-3 w-full rounded-[10px] bg-[#3b6ef5] font-semibold text-white hover:bg-[#4d7ef6]"
        disabled={score === 0 || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Rating"
        )}
      </Button>
      {submitError && (
        <p className="mt-2 text-sm text-rose-400">{submitError}</p>
      )}
    </motion.div>
  );
}

// ——— Tab 2: Reputation ———
function ReputationTab({
  ratingsReceived,
  loading,
}: {
  ratingsReceived: RatingRow[];
  loading: boolean;
}) {
  const counts = [0, 0, 0, 0, 0]; // index 0 = 5★, 1 = 4★, ... 4 = 1★
  ratingsReceived.forEach((r) => {
    const i = 5 - r.score;
    if (i >= 0 && i <= 4) counts[i] += 1;
  });
  const byStar = [5, 4, 3, 2, 1].map((star, i) => ({
    star,
    count: counts[i],
  }));
  const maxCount = Math.max(1, ...counts);

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm text-[#8494b4]">
          How candidates rate you
        </h3>
        <div className="space-y-2">
          {byStar.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-8 tabular-nums text-xs text-[#8494b4]">
                {star}★
              </span>
              <div className="flex-1 rounded-full bg-[#1a2438] h-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(count / maxCount) * 100}%`,
                  }}
                  transition={{ duration: 0.7 }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-xs text-[#8494b4]">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm text-[#8494b4]">Ratings received</h3>
        {ratingsReceived.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-[#1f2d47] bg-[#0f1522] py-12 text-center">
            <Star className="mb-2 h-10 w-10 text-[#1a2438]" />
            <p className="font-medium text-white">No ratings received yet</p>
            <p className="mt-1 text-sm text-[#8494b4]">
              Candidates will rate you after each hire
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ratingsReceived.map((r) => (
              <RatingReceivedCard key={r.id} rating={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RatingReceivedCard({ rating }: { rating: RatingRow }) {
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchJobTitle() {
      const { data } = await supabase
        .from("jobs")
        .select("title")
        .eq("id", rating.job_id)
        .maybeSingle();
      if (!cancelled && data?.title) setJobTitle(data.title);
    }
    void fetchJobTitle();
    return () => {
      cancelled = true;
    };
  }, [rating.job_id]);

  return (
    <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating value={rating.score} readOnly size="sm" />
          <span className="font-medium text-white tabular-nums">
            {rating.score} / 5
          </span>
        </div>
        <span className="text-xs text-[#8494b4] tabular-nums">
          {formatDate(rating.created_at)}
        </span>
      </div>
      <p className="mt-1 text-sm text-[#8494b4]">
        For: {jobTitle ?? "Job"}
      </p>
      {rating.comment && (
        <blockquote className="mt-2 border-l-2 border-[#1f2d47] pl-3 text-sm italic text-[#8494b4]">
          {rating.comment}
        </blockquote>
      )}
    </div>
  );
}
