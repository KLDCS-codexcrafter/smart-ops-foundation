/**
 * @file        src/types/duty-structure.ts
 * @purpose     3-Bucket Duty Structure · discriminated union · per (CTH × Country × Date band)
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q7=a discriminated union · EX-2-Q9=b label templates · EX-2-Q10=a history array
 * @disciplines FR-30 · FR-50 · FR-80
 */

export interface CustomsBucket {
  kind: 'customs';
  bcd_rate: number;
  bcd_label: string;
  sws_rate: number;
  sws_label: string;
  anti_dumping_rate: number | null;
  anti_dumping_label: string;
  safeguard_rate: number | null;
  safeguard_label: string;
}

export interface OtherBucket {
  kind: 'other';
  cvd_rate: number;
  cvd_label: string;
  health_cess_rate: number;
  health_cess_label: string;
  comp_cess_rate: number;
  comp_cess_label: string;
  nccd_rate: number;
  nccd_label: string;
}

export interface GSTBucket {
  kind: 'gst';
  igst_rate: number;
  igst_label: string;
  comp_cess_gst_rate: number;
  comp_cess_gst_label: string;
  cgst_rate: number;
  cgst_label: string;
  sgst_rate: number;
  sgst_label: string;
}

export type DutyBucket = CustomsBucket | OtherBucket | GSTBucket;

export interface DutyStructureHistoryEntry {
  timestamp: string;
  user_id: string;
  bucket_kind: DutyBucket['kind'];
  field_changed: string;
  old_value: number | string | null;
  new_value: number | string | null;
  justification: string;
  gazette_ref: string;
}

export interface DutyStructure {
  id: string;
  cth_code: string;
  country_code: string;
  effective_from: string;
  effective_until: string | null;
  buckets: [CustomsBucket, OtherBucket, GSTBucket];
  history: DutyStructureHistoryEntry[];
  created_at: string;
  updated_at: string;
}
