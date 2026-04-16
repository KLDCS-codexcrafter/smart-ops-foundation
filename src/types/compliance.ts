/**
 * compliance.ts — Compliance module types
 * RCM entries, future: TDS 26AS, 3CD types
 * [JWT] Replace with GET/POST /api/compliance/*
 */

export interface RCMEntry {
  id: string;
  voucher_id: string;
  voucher_no: string;
  entity_id: string;
  date: string;
  party_name: string;
  party_gstin: string;
  rcm_section: "section_9_3" | "section_9_4";
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  status: "open" | "posted" | "cancelled";
  rcm_jv_id?: string;
  rcm_jv_no?: string;
  posted_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
}

export const rcmEntriesKey = (e: string) => `erp_rcm_entries_${e}`;
