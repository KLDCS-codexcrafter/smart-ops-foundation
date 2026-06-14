/**
 * @file        src/__tests__/cl-2b/servicedesk-strip.test.ts
 * @sprint      T-CL2b-ServiceDesk-EngineStrip
 * @purpose     Prove entity isolation after stripping 75 DEFAULT_ENTITY signature defaults.
 *              Seed entity X (OPRX) + entity Y (SMRT). Assert X-call returns ONLY X's data.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createServiceTicket as _ct, // alias if exported differently — fallback below
  raiseServiceTicket,
  getServiceTicket,
  listServiceTickets,
  createAMCProposal,
  listAMCProposals,
  computeCustomerPnL,
  generateOTPForTicketClose,
  verifyOTPForTicketClose,
} from '@/lib/servicedesk-engine';

const X = 'OPRX';
const Y = 'SMRT';

const ticketBase = (entity_id: string, customer_id: string) => ({
  entity_id,
  branch_id: 'BR-1',
  customer_id,
  amc_record_id: null,
  call_type_code: 'REPAIR',
  channel: 'phone' as const,
  severity: 'sev3_medium' as const,
  description: `desc-${customer_id}`,
  sla_response_due_at: null,
  sla_resolution_due_at: null,
  flash_timer_minutes_remaining: 240,
  escalation_level: 0,
  assigned_engineer_id: null,
  repair_route_id: null,
  standby_loan_id: null,
  customer_in_voucher_id: null,
  customer_out_voucher_id: null,
  happy_code_otp_verified: false,
  happy_code_feedback_id: null,
  spares_consumed: [],
  photos: [],
  created_by: 'test',
});

const propBase = (entity_id: string, customer_id: string) => ({
  entity_id,
  amc_record_id: `amc-${customer_id}`,
  customer_id,
  proposal_code: `P-${customer_id}`,
  proposal_date: '2026-06-01',
  valid_until: '2026-07-01',
  proposed_value_paise: 100_000,
  proposed_start: '2026-07-01',
  proposed_end: '2027-07-01',
  proposed_billing_cycle: 'upfront' as const,
  oem_name: 'Voltas',
  service_inclusions: [],
  service_exclusions: [],
  email_template_id: null,
  language: 'en-IN',
  status: 'draft' as const,
  sent_at: null,
  accepted_at: null,
  rejected_at: null,
  rejection_reason: '',
  notes: '',
  created_by: 'test',
});

beforeEach(() => localStorage.clear());

describe('CL-2b · servicedesk-engine entity-isolation', () => {
  it('getServiceTicket returns null for X-id when called with Y', () => {
    const tX = raiseServiceTicket(ticketBase(X, 'CUST-X'));
    const tY = raiseServiceTicket(ticketBase(Y, 'CUST-Y'));
    expect(getServiceTicket(tX.id, X)?.id).toBe(tX.id);
    expect(getServiceTicket(tX.id, Y)).toBeNull();
    expect(getServiceTicket(tY.id, X)).toBeNull();
    expect(getServiceTicket(tY.id, Y)?.id).toBe(tY.id);
  });

  it('listServiceTickets({entity_id: X}) only returns X tickets', () => {
    raiseServiceTicket(ticketBase(X, 'CUST-X1'));
    raiseServiceTicket(ticketBase(X, 'CUST-X2'));
    raiseServiceTicket(ticketBase(Y, 'CUST-Y1'));
    const xList = listServiceTickets({ entity_id: X });
    const yList = listServiceTickets({ entity_id: Y });
    expect(xList).toHaveLength(2);
    expect(yList).toHaveLength(1);
    expect(xList.every((t) => t.entity_id === X)).toBe(true);
    expect(yList.every((t) => t.entity_id === Y)).toBe(true);
  });

  it('listAMCProposals(X) only returns X proposals', () => {
    createAMCProposal(propBase(X, 'CX-1'));
    createAMCProposal(propBase(X, 'CX-2'));
    createAMCProposal(propBase(Y, 'CY-1'));
    expect(listAMCProposals(X)).toHaveLength(2);
    expect(listAMCProposals(Y)).toHaveLength(1);
    expect(listAMCProposals(X).every((p) => p.entity_id === X)).toBe(true);
  });

  it('OTP generated under X is not verifiable under Y', () => {
    const { otp } = generateOTPForTicketClose('TK-X', X);
    expect(verifyOTPForTicketClose('TK-X', otp, Y)).toBe(false);
    expect(verifyOTPForTicketClose('TK-X', otp, X)).toBe(true);
  });

  it('computeCustomerPnL(X) only sees X data — proves cross-tenant read isolation', () => {
    raiseServiceTicket(ticketBase(X, 'CX-PNL-1'));
    raiseServiceTicket(ticketBase(Y, 'CY-PNL-1'));
    const xRows = computeCustomerPnL(X);
    const yRows = computeCustomerPnL(Y);
    // shape assertion: each row is anchored to its own entity's customers
    expect(xRows.every((r) => r.customer_id !== 'CY-PNL-1')).toBe(true);
    expect(yRows.every((r) => r.customer_id !== 'CX-PNL-1')).toBe(true);
  });
});
