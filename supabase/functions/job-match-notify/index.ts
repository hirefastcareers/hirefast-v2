// HireFast: Job match notifications
// Invoke with POST { "job_id": "uuid" } or no body to process jobs created in the last 2 hours.
// Finds candidates whose postcode (outward code) and sector/skills match the job; sends magic link to /candidate/jobs.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function outwardCode(postcode: string | null): string {
  if (!postcode?.trim()) return "";
  const trimmed = postcode.trim();
  const space = trimmed.indexOf(" ");
  return space >= 0 ? trimmed.slice(0, space).toUpperCase() : trimmed.slice(0, 4).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("HIREFAST_APP_URL") ?? "https://www.hirefast.uk";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let jobIds: string[] = [];

    try {
      const body = req.method === "POST" ? await req.json() : {};
      if (body.job_id) {
        jobIds = [body.job_id];
      }
    } catch {
      /* no body or invalid JSON */
    }

    if (jobIds.length === 0) {
      const since = new Date();
      since.setHours(since.getHours() - 2);
      const { data: recent } = await supabase
        .from("jobs")
        .select("id")
        .eq("is_active", true)
        .gte("created_at", since.toISOString())
        .limit(20);
      jobIds = (recent ?? []).map((r) => r.id);
    }

    if (jobIds.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No jobs to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;
    const MAX_CANDIDATES_PER_JOB = 30;

    for (const jobId of jobIds) {
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id, title, postcode, sector, required_skills")
        .eq("id", jobId)
        .eq("is_active", true)
        .single();

      if (jobErr || !job) continue;

      const outward = outwardCode(job.postcode);
      if (!outward) continue;

      const { data: candidates, error: candErr } = await supabase
        .from("candidates")
        .select("id, email, postcode, candidate_skills")
        .not("email", "is", null)
        .ilike("postcode", `${outward}%`)
        .limit(MAX_CANDIDATES_PER_JOB * 2);

      if (candErr || !candidates?.length) continue;

      const filtered = candidates.slice(0, MAX_CANDIDATES_PER_JOB);

      const emailsSentThisJob = new Set<string>();
      for (const cand of filtered) {
        const email = (cand.email ?? "").trim();
        if (!email || emailsSentThisJob.has(email)) continue;

        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${appUrl}/candidate/jobs`,
          },
        });

        if (otpErr) {
          console.error("job-match-notify signInWithOtp:", otpErr);
          continue;
        }
        emailsSentThisJob.add(email);
        totalSent++;
      }
    }

    return new Response(
      JSON.stringify({ processed: jobIds.length, emailsSent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("job-match-notify error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
