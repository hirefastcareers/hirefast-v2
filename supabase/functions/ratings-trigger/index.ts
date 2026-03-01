// HireFast: Two-Way Ratings trigger
// Runs on schedule; finds jobs closed 48+ hours ago, sends magic links to candidates
// so they can rate recruiters. Uses Supabase auth magic link (signInWithOtp).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("HIREFAST_APP_URL") ?? "https://www.hirefast.uk";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, recruiter_id, closed_at")
      .eq("is_active", false)
      .not("closed_at", "is", null)
      .is("ratings_trigger_sent_at", null)
      .lt("closed_at", cutoff.toISOString());

    if (jobsError) {
      console.error("ratings-trigger jobs fetch error:", jobsError);
      return new Response(
        JSON.stringify({ error: jobsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!jobs?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No jobs eligible" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;
    const candidateEmailsSent = new Set<string>();

    for (const job of jobs) {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, email, candidate_id")
        .eq("job_id", job.id)
        .in("status", ["shortlisted", "rejected"]);

      if (!apps?.length) continue;

      for (const app of apps) {
        const email = (app.email ?? "").trim();
        if (!email || candidateEmailsSent.has(email)) continue;

        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${appUrl}/candidate/ratings`,
          },
        });

        if (signInError) {
          console.error("ratings-trigger signInWithOtp error:", signInError);
          continue;
        }

        candidateEmailsSent.add(email);
        emailsSent++;

        await supabase.from("application_events").insert({
          application_id: app.id,
          event_type: "ratings_prompt_sent",
          message: "Rate your experience - magic link sent",
        });

        if (emailsSent >= 50) break;
      }

      await supabase
        .from("jobs")
        .update({ ratings_trigger_sent_at: new Date().toISOString() })
        .eq("id", job.id);

      if (emailsSent >= 50) break;
    }

    return new Response(
      JSON.stringify({ processed: jobs.length, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ratings-trigger error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
