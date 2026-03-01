-- ============================================================
-- HireFast Phase 2 schema updates
-- - Adds job closure + ratings trigger timestamps
-- - Adds SMS notification timestamp on application_events
-- Run this in Supabase Dashboard → SQL Editor.
-- ============================================================

-- 1) Jobs: track when a job was closed and when we sent ratings prompts
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS ratings_trigger_sent_at timestamptz;

-- Optional index to speed up the ratings trigger Edge Function
CREATE INDEX IF NOT EXISTS idx_jobs_closed_at_ratings_trigger
ON jobs (closed_at, ratings_trigger_sent_at, is_active);

-- 2) Application events: track when an SMS / push notification was sent
ALTER TABLE application_events
ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;

-- Optional index to speed up the status-feed SMS Edge Function
CREATE INDEX IF NOT EXISTS idx_application_events_sms_sent
ON application_events (sms_sent_at, created_at);

