// src/lib/location.ts
// Privacy-safe location helpers. Full postcodes never enter localStorage or DB.

import { supabase } from "@/lib/supabase";

export const HF_LOC_KEY = "hf_loc";

export interface HfLoc {
  partial_postcode: string;
  lat: number;
  lng: number;
}

export interface ResolvePostcodeResult {
  partial_postcode: string;
  lat: number;
  lng: number;
}

export function loadHfLoc(): HfLoc | null {
  try {
    const raw = localStorage.getItem(HF_LOC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HfLoc>;
    if (
      typeof parsed.partial_postcode === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
    ) {
      return {
        partial_postcode: parsed.partial_postcode,
        lat: parsed.lat,
        lng: parsed.lng,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveHfLoc(loc: HfLoc): void {
  localStorage.setItem(HF_LOC_KEY, JSON.stringify(loc));
}

export async function resolvePostcode(postcode: string): Promise<ResolvePostcodeResult> {
  const { data, error } = await supabase.functions.invoke("resolve-postcode", {
    body: { postcode },
  });
  if (error) throw new Error(error.message || "lookup_failed");
  if (data?.error) throw new Error(String(data.error));
  if (
    typeof data?.partial_postcode !== "string" ||
    typeof data?.lat !== "number" ||
    typeof data?.lng !== "number"
  ) {
    throw new Error("lookup_failed");
  }
  return {
    partial_postcode: data.partial_postcode,
    lat: data.lat,
    lng: data.lng,
  };
}

export async function resolveSitePostcode(postcode: string): Promise<ResolvePostcodeResult> {
  const { data, error } = await supabase.functions.invoke("resolve-site-postcode", {
    body: { postcode },
  });
  if (error) throw new Error(error.message || "lookup_failed");
  if (data?.error) throw new Error(String(data.error));
  if (
    typeof data?.partial_postcode !== "string" ||
    typeof data?.lat !== "number" ||
    typeof data?.lng !== "number"
  ) {
    throw new Error("lookup_failed");
  }
  return {
    partial_postcode: data.partial_postcode,
    lat: data.lat,
    lng: data.lng,
  };
}

/** Accept 07xxxxxxxxx or +447xxxxxxxxx (spaces allowed); normalise to +44… */
export function normaliseUkMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
  if (/^\+447\d{9}$/.test(digits)) return digits;
  if (/^447\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
