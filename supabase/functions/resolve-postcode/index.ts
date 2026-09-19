// supabase/functions/resolve-postcode/index.ts
// Validates a UK postcode and returns ONLY privacy-safe location data:
// the outward code (e.g. "S35") and that outward code's centroid.
// The full postcode is never persisted or logged.

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
const round3 = (n: number) => Math.round(n * 1000) / 1000;

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

    let lat: number | null = null;
    let lng: number | null = null;

    const ocRes = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`);
    if (ocRes.ok) {
      const oc = await ocRes.json();
      if (typeof oc.result?.latitude === "number" && typeof oc.result?.longitude === "number") {
        lat = round3(oc.result.latitude);
        lng = round3(oc.result.longitude);
      }
    }

    // Fallback: coarsen the full-postcode point to ~1km if the outcode has no centroid.
    if (lat === null || lng === null) {
      lat = Math.round(pc.result.latitude * 100) / 100;
      lng = Math.round(pc.result.longitude * 100) / 100;
    }

    return json({ partial_postcode: outcode, lat, lng });
  } catch {
    return json({ error: "lookup_failed" }, 502);
  }
});
