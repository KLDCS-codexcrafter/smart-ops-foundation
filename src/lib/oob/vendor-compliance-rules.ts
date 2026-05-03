/**
 * @file        vendor-compliance-rules.ts
 * @sprint      T-Phase-1.2.6f-b-2 · Block L · per D-281 (Full 6 rules)
 * @purpose     OOB-10 Vendor Compliance · rule-based stub · Phase 1.4 wires real APIs.
 * @disciplines FR-41 (India Compliance) · FR-26 (AI/ML stubs)
 * @[JWT]       Phase 1.4 → POST /api/compliance/validate (real GST/PAN/MSME APIs)
 */

import type { VendorQuotation } from '@/types/vendor-quotation';

export interface ComplianceRule {
  id: string;
  name: string;
  category: 'gst' | 'pan' | 'banking' | 'msme' | 'tds' | 'multi';
  validate: (q: VendorQuotation) => { ok: boolean; reason?: string };
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const VALID_TDS_SECTIONS = ['194C', '194J', '194I', '194Q', '194S', '195'];

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'gstin_format',
    name: 'GSTIN Format',
    category: 'gst',
    validate: (q) => {
      if (!q.vendor_gstin) return { ok: false, reason: 'GSTIN missing' };
      return GSTIN_RE.test(q.vendor_gstin)
        ? { ok: true }
        : { ok: false, reason: 'GSTIN format invalid · expect 15-char (state code + PAN + entity code + Z + check digit)' };
    },
  },
  {
    id: 'pan_format',
    name: 'PAN Format',
    category: 'pan',
    validate: (q) => {
      if (!q.vendor_gstin) return { ok: true };
      const pan = q.vendor_gstin.substring(2, 12);
      return PAN_RE.test(pan)
        ? { ok: true }
        : { ok: false, reason: 'PAN derived from GSTIN format invalid' };
    },
  },
  {
    id: 'ifsc_format',
    name: 'IFSC Code Format',
    category: 'banking',
    validate: () => {
      // Phase 1: stub passes (IFSC lives on vendor master · Phase 1.4 penny-drop)
      return { ok: true };
    },
  },
  {
    id: 'msme_validity',
    name: 'MSME Registration Status',
    category: 'msme',
    validate: (q) => {
      if (q.vendor_msme_status === null || q.vendor_msme_status === undefined) {
        return { ok: false, reason: 'MSME status not declared' };
      }
      return { ok: true };
    },
  },
  {
    id: 'tds_section_validity',
    name: 'TDS Section Validity',
    category: 'tds',
    validate: (q) => {
      if (q.rcm_applicable && !q.tds_section) {
        return { ok: false, reason: 'RCM applicable but TDS section missing' };
      }
      if (q.tds_section && !VALID_TDS_SECTIONS.includes(q.tds_section)) {
        return { ok: false, reason: `TDS section "${q.tds_section}" not in valid list (${VALID_TDS_SECTIONS.join(', ')})` };
      }
      return { ok: true };
    },
  },
  {
    id: 'gstin_state_match',
    name: 'GSTIN State Code',
    category: 'multi',
    validate: (q) => {
      if (!q.vendor_gstin) return { ok: true };
      const stateCode = q.vendor_gstin.substring(0, 2);
      return /^[0-9]{2}$/.test(stateCode)
        ? { ok: true }
        : { ok: false, reason: 'GSTIN state code (first 2 chars) invalid' };
    },
  },
];
