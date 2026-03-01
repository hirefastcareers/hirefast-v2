-- ============================================================
-- Session 7: job_views for Job Performance Dashboard
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

-- Table: one row per "view" of a job (e.g. when job is shown on job board)
CREATE TABLE IF NOT EXISTS job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);

ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can record a view for an active job
CREATE POLICY "job_views_insert_active_job"
  ON job_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id AND jobs.is_active = true
    )
  );

-- Recruiters can read view counts for their own jobs
CREATE POLICY "job_views_select_own_jobs"
  ON job_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id AND jobs.recruiter_id = auth.uid()
    )
  );
