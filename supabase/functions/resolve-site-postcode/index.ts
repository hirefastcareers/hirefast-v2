// supabase/functions/resolve-site-postcode/index.ts
// Employer premises (not personal data): return outward code + precise
// full-postcode coordinates (6 d.p.). Full postcode is never logged.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let raw = "";
  try {
    const body = await req.json();
    raw = String(body?.postcode ?? "");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  if (!UK_POSTCODE.test(cleaned)) return json({ error: "invalid_postcode" }, 422);

  try {
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
    if (pcRes.status === 404) return json({ error: "postcode_not_found" }, 422);
    if (!pcRes.ok) return json({ error: "lookup_failed" }, 502);
    const pc = await pcRes.json();
    const outcode: string = pc.result.outcode;
    const lat = round6(pc.result.latitude);
    const lng = round6(pc.result.longitude);

    return json({ partial_postcode: outcode, lat, lng });
  } catch {
    return json({ error: "lookup_failed" }, 502);
  }
});
