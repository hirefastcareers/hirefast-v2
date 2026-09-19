// src/lib/truth-engine.test.ts
import { describe, expect, it } from "vitest";
import { estimateMinutes, locationScore, scoreMatch, skillsScore } from "./truth-engine";

const job = {
  lat: 53.381,
  lng: -1.47,
  requiredSkills: ["forklift", "cscs"],
  sponsorshipAvailable: false,
  maxCommuteMiles: 20,
  sector: "engineering",
};

describe("truth engine", () => {
  it("scores 100 for location within 3 miles", () => {
    expect(locationScore(2.5, 20)).toBe(100);
  });

  it("scores 0 beyond max commute", () => {
    expect(locationScore(25, 20)).toBe(0);
  });

  it("returns null skills score when candidate has not provided skills", () => {
    expect(skillsScore([], ["forklift"])).toBeNull();
  });

  it("estimates minutes with road factor and buffer", () => {
    expect(estimateMinutes(10)).toBe(Math.round(((10 * 1.3) / 25) * 60 + 5));
  });

  it("uses 50/50 weighting for engineering", () => {
    const r = scoreMatch(
      { lat: 53.381, lng: -1.47, skills: ["forklift"], rtwStatus: "has_right_to_work" },
      job,
    );
    expect(r.location).toBe(100);
    expect(r.skills).toBe(50);
    expect(r.overall).toBe(75);
    expect(r.isPartial).toBe(false);
  });

  it("caps overall at 25 when sponsorship is needed but not offered", () => {
    const r = scoreMatch(
      { lat: 53.381, lng: -1.47, skills: ["forklift", "cscs"], rtwStatus: "needs_sponsorship" },
      job,
    );
    expect(r.overall).toBe(25);
    expect(r.rtw).toBe("risk");
  });

  it("marks score as partial before skills are captured", () => {
    const r = scoreMatch({ lat: 53.381, lng: -1.47, skills: [], rtwStatus: "unknown" }, job);
    expect(r.isPartial).toBe(true);
    expect(r.overall).toBe(100);
    expect(r.rtw).toBe("warning");
  });
});
