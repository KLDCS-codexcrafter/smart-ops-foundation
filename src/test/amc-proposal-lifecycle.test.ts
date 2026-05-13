/**
 * @file        src/test/amc-proposal-lifecycle.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createAMCProposal, transitionProposalStatus, listAMCProposals } from '@/lib/servicedesk-engine';

const baseProp = {
  entity_id: 'OPRX',
  amc_record_id: 'amc-1',
  customer_id: 'C-1',
  proposal_code: 'P-1',
  proposal_date: '2026-05-01',
  valid_until: '2026-06-01',
  proposed_value_paise: 100_000,
  proposed_start: '2026-06-01',
  proposed_end: '2027-06-01',
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
};

beforeEach(() => localStorage.clear());

describe('AMC proposal lifecycle', () => {
  it('saves draft', () => {
    const p = createAMCProposal(baseProp);
    expect(p.status).toBe('draft');
    expect(listAMCProposals()).toHaveLength(1);
  });
  it('draft → sent', () => {
    const p = createAMCProposal(baseProp);
    const next = transitionProposalStatus(p.id, 'sent', 'user1');
    expect(next.status).toBe('sent');
    expect(next.sent_at).not.toBeNull();
  });
  it('sent → negotiating', () => {
    const p = createAMCProposal(baseProp);
    transitionProposalStatus(p.id, 'sent', 'user1');
    const n = transitionProposalStatus(p.id, 'negotiating', 'user2');
    expect(n.status).toBe('negotiating');
  });
  it('sent → accepted', () => {
    const p = createAMCProposal(baseProp);
    transitionProposalStatus(p.id, 'sent', 'u');
    const n = transitionProposalStatus(p.id, 'accepted', 'u');
    expect(n.accepted_at).not.toBeNull();
  });
  it('sent → rejected captures reason', () => {
    const p = createAMCProposal(baseProp);
    transitionProposalStatus(p.id, 'sent', 'u');
    const n = transitionProposalStatus(p.id, 'rejected', 'u', 'price too high');
    expect(n.rejection_reason).toBe('price too high');
    expect(n.rejected_at).not.toBeNull();
  });
  it('negotiating → accepted', () => {
    const p = createAMCProposal(baseProp);
    transitionProposalStatus(p.id, 'sent', 'u');
    transitionProposalStatus(p.id, 'negotiating', 'u');
    const n = transitionProposalStatus(p.id, 'accepted', 'u');
    expect(n.status).toBe('accepted');
  });
  it('audit_trail captures actor for every transition', () => {
    const p = createAMCProposal(baseProp);
    transitionProposalStatus(p.id, 'sent', 'actor1');
    transitionProposalStatus(p.id, 'accepted', 'actor2');
    const got = listAMCProposals().find((x) => x.id === p.id);
    expect(got?.audit_trail.some((a) => a.by === 'actor1' && a.action === 'transition_to_sent')).toBe(true);
    expect(got?.audit_trail.some((a) => a.by === 'actor2' && a.action === 'transition_to_accepted')).toBe(true);
  });
});
