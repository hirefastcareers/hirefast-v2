import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import CandidateLanding from "@/pages/public/CandidateLanding";
import RecruiterLanding from "@/pages/public/RecruiterLanding";
import Register from "@/pages/candidate/Register";
import VerifyIdentity from "@/pages/candidate/VerifyIdentity";
import ShiftPreferences from "@/pages/candidate/ShiftPreferences";
import ProfileComplete from "@/pages/candidate/ProfileComplete";
import JobBoard from "@/pages/candidate/JobBoard";
import Applications from "@/pages/candidate/Applications";
import CandidateRatings from "@/pages/candidate/Ratings";
import Login from "@/pages/recruiter/Login";
import PostJob from "@/pages/recruiter/PostJob";
import ManageApplicants from "@/pages/recruiter/ManageApplicants";
import CandidateProfile from "@/pages/recruiter/CandidateProfile";
import Ratings from "@/pages/recruiter/Ratings";
import MagicLinkHandler from "@/pages/shared/MagicLinkHandler";
import NotFound from "@/pages/shared/NotFound";
import Settings from "@/pages/shared/Settings";
import WaitlistConfirmation from "@/pages/shared/WaitlistConfirmation";
import CandidateLayout from "@/layouts/CandidateLayout";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
      <Routes>
        <Route path="/" element={<CandidateLanding />} />
        <Route path="/recruiters" element={<RecruiterLanding />} />

        <Route path="/candidate/register" element={<Register />} />
        <Route path="/candidate" element={<CandidateLayout />}>
          <Route path="verify" element={<VerifyIdentity />} />
          <Route path="shifts" element={<ShiftPreferences />} />
          <Route path="profile-complete" element={<ProfileComplete />} />
          <Route path="jobs" element={<JobBoard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="ratings" element={<CandidateRatings />} />
        </Route>

        <Route path="/recruiter" element={<Outlet />}>
          <Route path="login" element={<Login />} />
          <Route path="post-job" element={<PostJob />} />
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
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
