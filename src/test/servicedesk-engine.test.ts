/**
 * Sprint T-Phase-1.C.1a · Block I.1 · ServiceDesk engine tests · T2 hardened
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAMCRecord,
  getAMCRecord,
  listAMCRecords,
  updateAMCRecord,
  deleteAMCRecord,
  decideAMCApplicability,
  createAMCProposal,
  transitionProposalStatus,
  createServiceEngineerProfile,
  listServiceEngineers,
  updateServiceEngineerLocation,
  getCallTypeConfiguration,
  listActiveCallTypes,
  computeAMCRiskScore,
  getAMCsByCustomer,
  getAMCsByInvoice,
  getAMCsExpiringInDays,
  generateOTPForTicketClose,
  verifyOTPForTicketClose,
  captureHappyCodeFeedback,
} from '@/lib/servicedesk-engine';
import type { AMCRecord, AMCProposal, ServiceEngineerProfile } from '@/types/servicedesk';

const ENTITY = 'OPRX';

const baseAMCInput = (overrides: Partial<AMCRecord> = {}): Omit<AMCRecord, 'id' | 'created_at' | 'updated_at' | 'audit_trail'> => ({
  entity_id: ENTITY,
  branch_id: 'BR-1',
  customer_id: 'C-1',
  sales_invoice_id: null,
  amc_applicable: null,
  applicability_decided_at: null,
  applicability_decided_by: null,
  applicability_reason: '',
  amc_code: 'AMC-T-1',
  amc_type: 'comprehensive',
  contract_start: null,
  contract_end: null,
  billing_cycle: 'upfront',
  contract_value_paise: 100_00_000,
  billed_to_date_paise: 0,
  outstanding_paise: 50_00_000,
  commission_salesman_pct: 2.5,
  commission_receiver_pct: 1,
  commission_amc_pct: 5,
  risk_score: 0,
  risk_bucket: 'low',
  renewal_probability: 0,
  status: 'applicability_pending',
  lifecycle_stage: 'applicability_decision',
  oem_name: 'Voltas',
  oem_sla_hours: null,
  iot_device_ids: [],
  whatsapp_lifecycle_phase: 'post_install',
  created_by: 'test',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('servicedesk-engine · AMC Record CRUD', () => {
  it('creates and retrieves an AMC record', () => {
    const rec = createAMCRecord(baseAMCInput());
    expect(rec.id).toMatch(/^amc_/);
    expect(getAMCRecord(rec.id)).toEqual(rec);
  });
  it('lists AMCs and filters by status', () => {
    createAMCRecord(baseAMCInput());
    createAMCRecord(baseAMCInput({ status: 'active' }));
    expect(listAMCRecords({ entity_id: ENTITY }).length).toBe(2);
    expect(listAMCRecords({ entity_id: ENTITY, status: 'active' }).length).toBe(1);
  });
  it('updates an AMC record with audit trail append', () => {
    const rec = createAMCRecord(baseAMCInput());
    const next = updateAMCRecord(rec.id, { status: 'active' }, 'auditor');
    expect(next.status).toBe('active');
    expect(next.audit_trail.length).toBeGreaterThan(rec.audit_trail.length);
  });
  it('deletes an AMC record', () => {
    const rec = createAMCRecord(baseAMCInput());
    expect(deleteAMCRecord(rec.id, 'auditor')).toBe(true);
    expect(getAMCRecord(rec.id)).toBeNull();
  });
  it('deleteAMCRecord audit-logs deletion with deleted_by (T2 AC-T2-2)', () => {
    const rec = createAMCRecord(baseAMCInput());
    deleteAMCRecord(rec.id, 'auditor');
    const delLog = JSON.parse(localStorage.getItem(`servicedesk_v1_amc_deleted_${ENTITY}`) ?? '[]');
    expect(delLog.length).toBe(1);
    expect(delLog[0].id).toBe(rec.id);
    const last = delLog[0].audit_trail[delLog[0].audit_trail.length - 1];
    expect(last.by).toBe('auditor');
    expect(last.action).toBe('deleted');
  });
});

describe('servicedesk-engine · AMC Applicability Decision', () => {
  it('flips status to proposal_draft when applicable=true', () => {
    const rec = createAMCRecord(baseAMCInput());
    const next = decideAMCApplicability(rec.id, true, 'auditor', 'eligible');
    expect(next.amc_applicable).toBe(true);
    expect(next.status).toBe('proposal_draft');
  });
  it('flips status to not_applicable when applicable=false', () => {
    const rec = createAMCRecord(baseAMCInput());
    const next = decideAMCApplicability(rec.id, false, 'auditor', 'out of scope');
    expect(next.status).toBe('not_applicable');
  });
});

describe('servicedesk-engine · AMC Proposal lifecycle', () => {
  it('transitions through sent → accepted', () => {
    const baseProp: Omit<AMCProposal, 'id' | 'created_at' | 'updated_at' | 'audit_trail'> = {
      entity_id: ENTITY,
      amc_record_id: 'amc-x',
      customer_id: 'C-1',
      proposal_code: 'AMC/PROP/001',
      proposal_date: '2026-05-12',
      valid_until: '2026-06-12',
      proposed_value_paise: 50_00_000,
      proposed_start: '2026-06-01',
      proposed_end: '2027-05-31',
      proposed_billing_cycle: 'upfront',
      oem_name: 'Voltas',
      service_inclusions: [],
      service_exclusions: [],
      email_template_id: null,
      language: 'en-IN',
      status: 'draft',
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      rejection_reason: '',
      notes: '',
      created_by: 'test',
    };
    const p = createAMCProposal(baseProp);
    const sent = transitionProposalStatus(p.id, 'sent', 'actor-1');
    expect(sent.status).toBe('sent');
    expect(sent.sent_at).toBeTruthy();
    expect(sent.audit_trail[sent.audit_trail.length - 1].by).toBe('actor-1');
    const acc = transitionProposalStatus(p.id, 'accepted', 'actor-2');
    expect(acc.accepted_at).toBeTruthy();
    expect(acc.audit_trail[acc.audit_trail.length - 1].by).toBe('actor-2');
  });
});

describe('servicedesk-engine · Service Engineer Profile', () => {
  const baseEng: Omit<ServiceEngineerProfile, 'id' | 'created_at' | 'updated_at'> = {
    entity_id: ENTITY,
    sam_person_id: 'sam-1',
    service_role: 'service_engineer',
    skills: ['HVAC'],
    oem_authorizations: ['Voltas'],
    certifications: [],
    current_lat: null,
    current_lng: null,
    current_location_updated_at: null,
    active_ticket_ids: [],
    daily_capacity: 5,
    total_tickets_resolved: 0,
    avg_csat_score: 0,
    avg_happy_code_score: 0,
    is_active: true,
  };
  it('creates and lists by OEM filter', () => {
    createServiceEngineerProfile(baseEng);
    expect(listServiceEngineers({ entity_id: ENTITY, oem_authorization: 'Voltas' }).length).toBe(1);
    expect(listServiceEngineers({ entity_id: ENTITY, oem_authorization: 'Daikin' }).length).toBe(0);
  });
  it('updates engineer location', () => {
    const eng = createServiceEngineerProfile(baseEng);
    const next = updateServiceEngineerLocation(eng.id, 19.07, 72.87);
    expect(next.current_lat).toBe(19.07);
    expect(next.current_lng).toBe(72.87);
  });
});

describe('servicedesk-engine · Call Type configuration', () => {
  it('returns standard call types', () => {
    const ct = getCallTypeConfiguration('INSTALL');
    expect(ct?.display_name).toBe('Installation');
  });
  it('lists active call types', () => {
    expect(listActiveCallTypes().length).toBeGreaterThan(0);
  });
});

describe('servicedesk-engine · Risk Engine', () => {
  it('computes risk score from 5 factors', () => {
    const rec = createAMCRecord(baseAMCInput({ status: 'active' }));
    const r = computeAMCRiskScore(rec.id);
    expect(r.risk_score).toBeGreaterThanOrEqual(0);
    expect(['low', 'medium', 'high']).toContain(r.risk_bucket);
    expect(r.factor_breakdown.payment_history).toBeDefined();
  });
});

describe('servicedesk-engine · Cross-card queries', () => {
  it('finds AMCs by customer + invoice + expiry window', () => {
    const rec = createAMCRecord(baseAMCInput({ sales_invoice_id: 'INV-1', contract_end: new Date(Date.now() + 5 * 86400000).toISOString() }));
    expect(getAMCsByCustomer(rec.customer_id).length).toBe(1);
    expect(getAMCsByInvoice('INV-1').length).toBe(1);
    expect(getAMCsExpiringInDays(30).length).toBe(1);
  });
});

describe('servicedesk-engine · OTP gate', () => {
  it('generates and verifies OTP', () => {
    const { otp } = generateOTPForTicketClose('T-1');
    expect(otp).toMatch(/^\d{6}$/);
    expect(verifyOTPForTicketClose('T-1', otp)).toBe(true);
  });
  it('rejects wrong OTP', () => {
    generateOTPForTicketClose('T-2');
    expect(verifyOTPForTicketClose('T-2', '000000')).toBe(false);
  });
  it('captures HappyCode feedback honoring entity_id (T2 AC-T2-5)', () => {
    const fb = captureHappyCodeFeedback({
      entity_id: ENTITY,
      ticket_id: 'T-3',
      customer_id: 'C-1',
      source: 'otp_channel',
      otp_verified: true,
      otp_verified_at: new Date().toISOString(),
      email_nps_score: null,
      email_response_at: null,
      verbal_nps_score: null,
      verbal_happiness_score: null,
      verbal_captured_at: null,
      verbal_captured_by: null,
      notes: '',
    });
    expect(fb.id).toMatch(/^happy_/);
    const stored = JSON.parse(localStorage.getItem(`servicedesk_v1_happy_${ENTITY}`) ?? '[]');
    expect(stored.length).toBe(1);
  });
  it('OTP expiry is 15 minutes per v5 §3 / v4 §3.1 (T2 AC-T2-6)', () => {
    const before = Date.now();
    const { expires_at } = generateOTPForTicketClose('T-EXPIRE-1');
    const actual = new Date(expires_at).getTime();
    expect(actual).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(actual).toBeLessThanOrEqual(before + 16 * 60 * 1000);
  });
  it('OTP rejected after expiry', () => {
    vi.useFakeTimers();
    const { otp } = generateOTPForTicketClose('T-EXP-2');
    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(verifyOTPForTicketClose('T-EXP-2', otp)).toBe(false);
    vi.useRealTimers();
  });
});
