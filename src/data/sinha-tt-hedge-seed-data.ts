/**
 * @file        src/data/sinha-tt-hedge-seed-data.ts
 * @purpose     3 Sinha TT Payments + 3 Form15CASubmissions + 2 Hedge Contracts · empirically cross-referenced
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q10=b · cross-refs verified at HEAD 4386740d
 */
import type { TTPayment } from '@/types/tt-payment';
import type { Form15CASubmission } from '@/types/form-15ca-15cb';
import type { HedgeContract } from '@/types/hedge-contract';

const now = '2026-05-19T00:00:00.000Z';

export const SINHA_TT_PAYMENTS: TTPayment[] = [
  {
    id: 'tt-sinha-001', tt_payment_no: 'TT-SINHA-2026-001', entity_id: 'sinha-trading', status: 'credited_to_beneficiary',
    related_import_po_id: 'ipo-sinha-001', related_import_po_no: 'IPO-SINHA-2026-001',
    related_foreign_vendor_id: 'fv-sinha-001',
    related_form_15ca_submission_id: '15ca-001', related_auto_posted_voucher_id: 'apv-tt-001',
    ad_bank_code: 'CITIINBX', ad_bank_name: 'Citibank N.A. · Mumbai',
    beneficiary_bank_name: 'Bank of China · Guangzhou', beneficiary_account_no: 'GZ-1234567890', beneficiary_swift_code: 'BKCHCNBJ',
    currency_code: 'USD', amount_foreign: 12000, buying_rate_applied: 84.50, amount_inr: 1014000,
    bank_charges_inr: 1500, total_debit_inr: 1015500,
    rbi_purpose_code: 'S0302', rbi_purpose_description: 'Imports of goods · payment against documents',
    initiated_at: '2026-05-10T00:00:00.000Z', pending_15ca_15cb_at: '2026-05-10T01:00:00.000Z',
    submitted_to_bank_at: '2026-05-11T00:00:00.000Z', in_transit_at: '2026-05-11T02:00:00.000Z', credited_at: '2026-05-13T00:00:00.000Z',
    notes: 'TT for China import · Part B Form 15CA · realised',
    created_at: now, updated_at: now, created_by: 'sinha-finance',
  },
  {
    id: 'tt-sinha-002', tt_payment_no: 'TT-SINHA-2026-002', entity_id: 'sinha-trading', status: 'in_transit',
    related_import_po_id: 'ipo-sinha-002', related_import_po_no: 'IPO-SINHA-2026-002',
    related_foreign_vendor_id: 'fv-sinha-002',
    related_form_15ca_submission_id: '15ca-002', related_auto_posted_voucher_id: 'apv-tt-002',
    ad_bank_code: 'HDFCINBB', ad_bank_name: 'HDFC Bank · Mumbai',
    beneficiary_bank_name: 'Bangkok Bank PCL', beneficiary_account_no: 'BKK-9876543210', beneficiary_swift_code: 'BKKBTHBK',
    currency_code: 'USD', amount_foreign: 8500, buying_rate_applied: 84.80, amount_inr: 720800,
    bank_charges_inr: 1200, total_debit_inr: 722000,
    rbi_purpose_code: 'S0302', rbi_purpose_description: 'Imports of goods · payment against documents',
    initiated_at: '2026-05-15T00:00:00.000Z', pending_15ca_15cb_at: '2026-05-15T01:00:00.000Z',
    submitted_to_bank_at: '2026-05-16T00:00:00.000Z', in_transit_at: '2026-05-17T00:00:00.000Z', credited_at: null,
    notes: 'TT for Thailand UAE-CEPA · Part D DTAA-exempt · in transit',
    created_at: now, updated_at: now, created_by: 'sinha-finance',
  },
  {
    id: 'tt-sinha-003', tt_payment_no: 'TT-SINHA-2026-003', entity_id: 'sinha-trading', status: 'pending_15ca_15cb',
    related_import_po_id: 'ipo-sinha-003', related_import_po_no: 'IPO-SINHA-2026-003',
    related_foreign_vendor_id: 'fv-sinha-003',
    related_form_15ca_submission_id: '15ca-003', related_auto_posted_voucher_id: null,
    ad_bank_code: 'ICICINBB', ad_bank_name: 'ICICI Bank · Mumbai',
    beneficiary_bank_name: 'DBS Bank · Singapore', beneficiary_account_no: 'SG-5555-666-777', beneficiary_swift_code: 'DBSSSGSG',
    currency_code: 'SGD', amount_foreign: 5800, buying_rate_applied: 62.30, amount_inr: 361340,
    bank_charges_inr: 800, total_debit_inr: 362140,
    rbi_purpose_code: 'S0302', rbi_purpose_description: 'Imports of goods · payment against documents',
    initiated_at: '2026-05-18T00:00:00.000Z', pending_15ca_15cb_at: '2026-05-18T01:00:00.000Z',
    submitted_to_bank_at: null, in_transit_at: null, credited_at: null,
    notes: 'TT for Singapore ASEAN-FTA · Part A ≤5L self-declaration · pending 15CA',
    created_at: now, updated_at: now, created_by: 'sinha-finance',
  },
];

export const SINHA_FORM_15CAS: Form15CASubmission[] = [
  { id: '15ca-001', form_15ca_ref: '15CA-2026-001', form_15cb_ref: null, entity_id: 'sinha-trading', status: 'acknowledged', part: 'Part_B', related_import_po_id: 'ipo-sinha-001', related_tt_payment_id: 'tt-sinha-001', rbi_purpose_code: 'S0302', amount_foreign: 12000, amount_inr: 1014000, currency_code: 'USD', ca_name: '', ca_membership_no: '', ca_certified_at: null, ca_digital_signature_ref: null, efiling_acknowledgment_no: 'ACK-2026-IT-001', efiling_filed_at: '2026-05-11T00:00:00.000Z', tds_rate_pct: 0, tds_amount_inr: 0, dtaa_country_code: null, dtaa_article_ref: null, notes: 'Part B · AO order ref attached', created_at: now, updated_at: now },
  { id: '15ca-002', form_15ca_ref: '15CA-2026-002', form_15cb_ref: null, entity_id: 'sinha-trading', status: 'acknowledged', part: 'Part_D', related_import_po_id: 'ipo-sinha-002', related_tt_payment_id: 'tt-sinha-002', rbi_purpose_code: 'S0302', amount_foreign: 8500, amount_inr: 720800, currency_code: 'USD', ca_name: '', ca_membership_no: '', ca_certified_at: null, ca_digital_signature_ref: null, efiling_acknowledgment_no: 'ACK-2026-IT-002', efiling_filed_at: '2026-05-16T00:00:00.000Z', tds_rate_pct: 0, tds_amount_inr: 0, dtaa_country_code: 'TH', dtaa_article_ref: 'India-Thailand DTAA Art 12', notes: 'Part D · DTAA exempt', created_at: now, updated_at: now },
  { id: '15ca-003', form_15ca_ref: '15CA-2026-003', form_15cb_ref: null, entity_id: 'sinha-trading', status: 'draft', part: 'Part_A', related_import_po_id: 'ipo-sinha-003', related_tt_payment_id: 'tt-sinha-003', rbi_purpose_code: 'S0302', amount_foreign: 5800, amount_inr: 361340, currency_code: 'SGD', ca_name: '', ca_membership_no: '', ca_certified_at: null, ca_digital_signature_ref: null, efiling_acknowledgment_no: null, efiling_filed_at: null, tds_rate_pct: 0, tds_amount_inr: 0, dtaa_country_code: null, dtaa_article_ref: null, notes: 'Part A · ≤5L self-declaration · draft', created_at: now, updated_at: now },
];

export const SINHA_HEDGE_CONTRACTS: HedgeContract[] = [
  { id: 'hc-sinha-001', hedge_contract_no: 'HC-SINHA-2026-001', entity_id: 'sinha-trading', status: 'open', direction: 'forward_sell', ad_bank_code: 'CITIINBX', ad_bank_name: 'Citibank N.A.', currency_code: 'USD', notional_amount_foreign: 50000, forward_rate_locked: 86.20, notional_amount_inr_at_lock: 4310000, booking_date: '2026-05-01', maturity_date: '2026-08-01', settlement_date: null, linked_export_po_id: 'expo-sinha-001', linked_import_po_id: null, is_speculative: false, spot_rate_at_maturity: null, settlement_variance_inr: 0, notes: 'USD forward sell hedge · locks export realisation rate for Sinha USA buyer', created_at: now, updated_at: now },
  { id: 'hc-sinha-002', hedge_contract_no: 'HC-SINHA-2026-002', entity_id: 'sinha-trading', status: 'open', direction: 'forward_buy', ad_bank_code: 'HDFCINBB', ad_bank_name: 'HDFC Bank', currency_code: 'EUR', notional_amount_foreign: 20000, forward_rate_locked: 92.50, notional_amount_inr_at_lock: 1850000, booking_date: '2026-05-10', maturity_date: '2026-07-10', settlement_date: null, linked_export_po_id: null, linked_import_po_id: null, is_speculative: true, spot_rate_at_maturity: null, settlement_variance_inr: 0, notes: 'EUR forward buy speculative hedge · CFO forex view', created_at: now, updated_at: now },
];
