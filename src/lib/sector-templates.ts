// src/lib/sector-templates.ts
// Sector templates for ≤5-field job posting and candidate skill chips.

export type SectorKey =
  | "logistics"
  | "engineering"
  | "manufacturing"
  | "retail"
  | "hospitality"
  | "care";

export interface SectorTemplate {
  key: SectorKey;
  label: string;
  suggestedTitles: string[];
  requiredSkills: string[];
  maxCommuteMiles: number;
  defaultShift: string;
}

export const SECTOR_TEMPLATES: Record<SectorKey, SectorTemplate> = {
  logistics: {
    key: "logistics",
    label: "Logistics / Warehousing",
    suggestedTitles: ["Warehouse Operative", "Picker Packer", "Forklift Driver", "Goods In"],
    requiredSkills: ["forklift", "counterbalance", "reach truck", "manual handling"],
    maxCommuteMiles: 20,
    defaultShift: "Days",
  },
  engineering: {
    key: "engineering",
    label: "Engineering",
    suggestedTitles: ["Maintenance Engineer", "CNC Operator", "Fitters Mate", "Multi-skilled Engineer"],
    requiredSkills: ["cscs", "cnc", "welding", "electrical"],
    maxCommuteMiles: 25,
    defaultShift: "Days",
  },
  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing",
    suggestedTitles: ["Production Operative", "Machine Operator", "Assembly Operative", "Quality Inspector"],
    requiredSkills: ["cnc", "assembly", "quality control", "manual handling"],
    maxCommuteMiles: 20,
    defaultShift: "Rotating",
  },
  retail: {
    key: "retail",
    label: "Retail",
    suggestedTitles: ["Retail Assistant", "Sales Advisor", "Stock Assistant", "Customer Assistant"],
    requiredSkills: ["customer service", "till trained", "stock replenishment"],
    maxCommuteMiles: 15,
    defaultShift: "Flexible",
  },
  hospitality: {
    key: "hospitality",
    label: "Hospitality",
    suggestedTitles: ["Kitchen Porter", "Chef de Partie", "Bar Staff", "Waiting Staff"],
    requiredSkills: ["food hygiene", "customer service", "kitchen"],
    maxCommuteMiles: 15,
    defaultShift: "Flexible",
  },
  care: {
    key: "care",
    label: "Care",
    suggestedTitles: ["Care Assistant", "Support Worker", "Healthcare Assistant", "Senior Carer"],
    requiredSkills: ["dbs", "care certificate", "manual handling", "medication"],
    maxCommuteMiles: 15,
    defaultShift: "Days",
  },
};

export const SHIFT_OPTIONS = ["Days", "Nights", "Rotating", "Weekends", "Flexible"] as const;
export type ShiftOption = (typeof SHIFT_OPTIONS)[number];

export function skillsForSector(sector: string | null | undefined): string[] {
  const key = (sector ?? "").toLowerCase().split(/[/\s]/)[0] as SectorKey;
  return SECTOR_TEMPLATES[key]?.requiredSkills ?? [];
}
