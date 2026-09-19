import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route, Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OrgProvider } from "@/contexts/OrgContext";
import { Skeleton } from "@/components/ui/skeleton";
import CandidateLanding from "@/pages/public/CandidateLanding";
import RecruiterLanding from "@/pages/public/RecruiterLanding";
import JobsBoard from "@/pages/candidate/JobsBoard";
import MyApplications from "@/pages/candidate/MyApplications";
import MeProfile from "@/pages/candidate/MeProfile";
import MagicLinkHandler from "@/pages/shared/MagicLinkHandler";
import NotFound from "@/pages/shared/NotFound";
import Privacy from "@/pages/shared/Privacy";
import Terms from "@/pages/shared/Terms";
import CandidateLayout from "@/layouts/CandidateLayout";

const Register = lazy(() => import("@/pages/candidate/Register"));
const VerifyIdentity = lazy(() => import("@/pages/candidate/VerifyIdentity"));
const ShiftPreferences = lazy(() => import("@/pages/candidate/ShiftPreferences"));
const ProfileComplete = lazy(() => import("@/pages/candidate/ProfileComplete"));
const CandidateRatings = lazy(() => import("@/pages/candidate/Ratings"));
const Login = lazy(() => import("@/pages/recruiter/Login"));
const PostJobV2 = lazy(() => import("@/pages/recruiter/PostJobV2"));
const Dashboard = lazy(() => import("@/pages/recruiter/Dashboard"));
const JobApplicants = lazy(() => import("@/pages/recruiter/JobApplicants"));
const ManageApplicants = lazy(() => import("@/pages/recruiter/ManageApplicants"));
const JobPerformance = lazy(() => import("@/pages/recruiter/JobPerformance"));
const CandidateProfile = lazy(() => import("@/pages/recruiter/CandidateProfile"));
const Ratings = lazy(() => import("@/pages/recruiter/Ratings"));
const Settings = lazy(() => import("@/pages/shared/Settings"));
const WaitlistConfirmation = lazy(() => import("@/pages/shared/WaitlistConfirmation"));

function LazyFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <OrgProvider>
        <TooltipProvider>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<CandidateLanding />} />
              <Route path="/recruiters" element={<RecruiterLanding />} />
              <Route path="/jobs" element={<JobsBoard />} />
              <Route path="/me" element={<MeProfile />} />
              <Route path="/me/applications" element={<MyApplications />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              <Route path="/candidate/register" element={<Register />} />
              <Route path="/candidate/jobs" element={<Navigate to="/jobs" replace />} />
              <Route
                path="/candidate/applications"
                element={<Navigate to="/me/applications" replace />}
              />
              <Route path="/candidate" element={<CandidateLayout />}>
                <Route path="verify" element={<VerifyIdentity />} />
                <Route path="shifts" element={<ShiftPreferences />} />
                <Route path="profile-complete" element={<ProfileComplete />} />
                <Route path="ratings" element={<CandidateRatings />} />
              </Route>

              <Route path="/recruiter" element={<Outlet />}>
                <Route index element={<Dashboard />} />
                <Route path="login" element={<Login />} />
                <Route path="post-job" element={<PostJobV2 />} />
                <Route path="jobs/:id" element={<JobApplicants />} />
                <Route path="jobs" element={<JobPerformance />} />
                <Route path="applicants" element={<ManageApplicants />} />
                <Route path="candidate/:id" element={<CandidateProfile />} />
                <Route path="ratings" element={<Ratings />} />
              </Route>

              <Route path="/auth/callback" element={<MagicLinkHandler />} />
              <Route path="/waitlist-confirmation" element={<WaitlistConfirmation />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </OrgProvider>
    </BrowserRouter>
  );
}

export default App;
