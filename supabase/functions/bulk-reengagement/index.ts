// HireFast: Bulk Re-Engagement — magic link interest checks for dormant applicants
// Finds applications pending 7+ days with no recent contact, sends magic links.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DORMANT_DAYS = 7;
const MAX_PER_RUN = 30;

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
    cutoff.setDate(cutoff.getDate() - DORMANT_DAYS);
    const cutoffIso = cutoff.toISOString();

    const { data: dormant, error: appsError } = await supabase
      .from("applications")
      .select("id, email, interest_check_sent_at, last_contacted_at")
      .eq("status", "pending")
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoffIso}`)
      .limit(MAX_PER_RUN * 2);

    if (appsError) {
      console.error("bulk-reengagement fetch error:", appsError);
      return new Response(
        JSON.stringify({ error: appsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eligible =
      dormant?.filter((a) => {
        const sent = a.interest_check_sent_at;
        if (!sent) return true;
        return new Date(sent) < cutoff;
      }) ?? [];

    let sent = 0;
    const emailsSent = new Set<string>();

    for (const app of eligible.slice(0, MAX_PER_RUN)) {
      const email = (app.email ?? "").trim();
      if (!email || emailsSent.has(email)) continue;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/candidate/applications`,
        },
      });

      if (otpError) {
        console.error("bulk-reengagement signInWithOtp error:", otpError);
        continue;
      }

      const now = new Date().toISOString();
      const token = crypto.randomUUID();

      await supabase
        .from("applications")
        .update({
          interest_check_token: token,
          interest_check_sent_at: now,
        })
        .eq("id", app.id);

      await supabase.from("application_events").insert({
        application_id: app.id,
        event_type: "interest_check_sent",
        message: "Interest check (bulk re-engagement) sent",
      });

      emailsSent.add(email);
      sent++;
    }

    return new Response(
      JSON.stringify({ processed: eligible.length, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bulk-reengagement error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
