// HireFast: WhatsApp-style Status Feed — SMS notifications via Twilio
// Sends SMS to candidates when key application events occur (shortlisted, rejected, etc.)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVENT_SMS: Record<string, string> = {
  shortlisted: "HireFast: Great news! You've been shortlisted. Log in to view: ",
  rejected: "HireFast: Your application was not successful this time. Log in for details: ",
  interest_check_sent: "HireFast: Are you still interested? Tap to check your application: ",
};

function formatUKPhone(phone: string | null): string | null {
  if (!phone?.trim()) return null;
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0")) p = "44" + p.slice(1);
  else if (!p.startsWith("+") && !p.startsWith("44")) p = "44" + p;
  return p.startsWith("+") ? p.slice(1) : p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  const appUrl = Deno.env.get("HIREFAST_APP_URL") ?? "https://www.hirefast.uk";

  if (!sid || !token || !from) {
    return new Response(
      JSON.stringify({ error: "Twilio credentials not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: events, error: eventsError } = await supabase
      .from("application_events")
      .select("id, application_id, event_type")
      .is("sms_sent_at", null)
      .in("event_type", Object.keys(EVENT_SMS))
      .limit(20);

    if (eventsError || !events?.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: eventsError?.message ?? "No events" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appIds = [...new Set(events.map((e) => e.application_id))];
    const { data: apps } = await supabase
      .from("applications")
      .select("id, phone, email")
      .in("id", appIds);

    const appMap = new Map((apps ?? []).map((a) => [a.id, a]));
    const now = new Date().toISOString();
    let sent = 0;

    for (const ev of events) {
      const msg = EVENT_SMS[ev.event_type];
      if (!msg) continue;

      const app = appMap.get(ev.application_id);
      const phone = formatUKPhone(app?.phone ?? null);
      if (!phone) continue;

      const body = msg + appUrl;

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${sid}:${token}`),
          },
          body: new URLSearchParams({
            To: "+" + phone,
            From: from,
            Body: body,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Twilio error:", err);
        continue;
      }

      await supabase
        .from("application_events")
        .update({ sms_sent_at: now })
        .eq("id", ev.id);

      sent++;
    }

    return new Response(
      JSON.stringify({ sent, total: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("status-feed-sms error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
