-- ============================================================
-- HireFast: RLS policies for the ratings table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Enable RLS on ratings (safe to run if already enabled)
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 2. Optional: drop existing policies if you need to re-run this script
-- Uncomment and run once if you get "policy already exists" errors:
/*
DROP POLICY IF EXISTS "Candidates can select own ratings" ON ratings;
DROP POLICY IF EXISTS "Candidates can insert own candidate ratings" ON ratings;
DROP POLICY IF EXISTS "Recruiters can select own ratings" ON ratings;
DROP POLICY IF EXISTS "Recruiters can insert own recruiter ratings" ON ratings;
*/

-- 3. Candidate: can read ratings where they are the candidate
CREATE POLICY "Candidates can select own ratings"
ON ratings FOR SELECT
TO authenticated
USING (
  candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
);

-- 4. Candidate: can insert a rating when they are rating a recruiter (rated_by = 'candidate')
CREATE POLICY "Candidates can insert own candidate ratings"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (
  rated_by = 'candidate'
  AND candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
);

-- 5. Recruiter: can read ratings where they are the recruiter
CREATE POLICY "Recruiters can select own ratings"
ON ratings FOR SELECT
TO authenticated
USING (
  recruiter_id = auth.uid()
);

-- 6. Recruiter: can insert a rating when they are rating a candidate (rated_by = 'recruiter')
CREATE POLICY "Recruiters can insert own recruiter ratings"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (
  rated_by = 'recruiter'
  AND recruiter_id = auth.uid()
);
