/**
 * Shared Supabase-backed types for HireFast (Truth Engine v2).
 */

export type RtwStatus = "has_right_to_work" | "needs_sponsorship" | "unknown";

export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export interface Candidate {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  /** @deprecated Prefer partial_postcode — full postcode must not be used in UI */
  postcode?: string | null;
  partial_postcode: string | null;
  loc_lat: number | null;
  loc_lng: number | null;
  rtw_status: RtwStatus;
  skills: string[];
  candidate_skills?: string[];
  has_rtw?: boolean | null;
  rtw_verified?: boolean | null;
  ni_confirmed?: boolean | null;
  dbs_status?: string | null;
  availability?: string[];
  has_vehicle?: boolean | null;
  transport_mode?: string | null;
  cv_url?: string | null;
  cv_text?: string | null;
  profile_token?: string | null;
  speed_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  recruiter_id: string | null;
  title: string;
  location_name: string | null;
  /** @deprecated Prefer partial_postcode for display */
  postcode?: string | null;
  partial_postcode: string | null;
  loc_lat: number | null;
  loc_lng: number | null;
  sector: string | null;
  pay_rate: string | null;
  /** Numeric £/hr when available */
  pay_per_hour?: number | null;
  description: string | null;
  shift_patterns: string[];
  commute_threshold_mins?: number;
  required_skills: string[];
  sponsorship_available: boolean;
  max_commute_miles: number;
  is_published: boolean;
  auto_reject_low_matches?: boolean;
  immediate_start?: boolean;
  is_active?: boolean;
  status?: string;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  employer_id?: string | null;
  candidate_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** @deprecated */
  candidate_postcode?: string | null;
  commute_distance_miles?: number | null;
  commute_risk_level?: "low" | "medium" | "high" | null;
  journey_time_mins?: number | null;
  match_score?: number | null;
  status: ApplicationStatus | string;
  status_updated_at?: string;
  apply_duration_ms?: number | null;
  outcome?: string | null;
  has_rtw?: boolean | null;
  has_certs?: boolean | null;
  candidate_skills?: string[];
  interest_status?: string;
  interest_check_token?: string | null;
  interest_check_sent_at?: string | null;
  interest_confirmed_at?: string | null;
  last_contacted_at?: string | null;
  shortlisted_at?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Employer {
  id: string;
  company_name: string;
  admin_email: string;
  industry_sector: string | null;
  location: string | null;
  website: string | null;
  company_description: string | null;
  created_by: string;
  created_at: string;
}

export interface Rating {
  id: string;
  job_id: string;
  recruiter_id: string;
  candidate_id: string;
  rated_by: "recruiter" | "candidate";
  score: number;
  comment: string | null;
  created_at: string;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: string;
  message: string | null;
  created_at: string;
}

export interface JobApplicantRow {
  application_id: string;
  candidate_id: string;
  full_name: string | null;
  phone: string | null;
  partial_postcode: string | null;
  rtw_status: RtwStatus | string | null;
  skills: string[] | null;
  status: ApplicationStatus | string;
  applied_at: string;
  status_updated_at: string;
  commute_miles: number | null;
  commute_minutes_est: number | null;
  location_score: number | null;
  skills_score: number | null;
  overall_score: number | null;
  is_partial: boolean;
  rtw_flag: "match" | "warning" | "risk" | string;
}

export interface EmployerResponseRate {
  employer_id: string;
  response_rate: number | null;
  sample_size: number;
}
