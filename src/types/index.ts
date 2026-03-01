/**
 * Shared Supabase-backed types for HireFast.
 * Aligned with .cursorrules schema.
 */

export interface Candidate {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  postcode: string;
  candidate_skills: string[];
  has_rtw: boolean;
  rtw_verified: boolean;
  ni_confirmed: boolean;
  dbs_status: string | null;
  availability: string[];
  has_vehicle: boolean;
  transport_mode: string | null;
  cv_url: string | null;
  cv_text: string | null;
  profile_token: string | null;
  speed_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  recruiter_id: string;
  title: string;
  location_name: string;
  postcode: string;
  sector: string;
  pay_rate: string;
  description: string | null;
  shift_patterns: string[];
  commute_threshold_mins: number;
  required_skills: string[];
  auto_reject_low_matches: boolean;
  immediate_start: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  employer_id: string;
  candidate_id: string;
  full_name: string;
  email: string;
  phone: string;
  candidate_postcode: string;
  commute_distance_miles: number | null;
  commute_risk_level: "low" | "medium" | "high" | null;
  journey_time_mins: number | null;
  match_score: number | null;
  status: string;
  outcome: string | null;
  has_rtw: boolean | null;
  has_certs: boolean | null;
  candidate_skills: string[];
  interest_status: string;
  interest_check_token: string | null;
  interest_check_sent_at: string | null;
  interest_confirmed_at: string | null;
  last_contacted_at: string | null;
  shortlisted_at: string | null;
  reason: string | null;
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
