/**
 * @file        src/test/standby-loan-revenue-leak.test.ts
 * @purpose     StandbyLoan OOB-18 revenue leak protection · daily cost compute
 * @sprint      T-Phase-1.C.1c · Block H.3
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStandbyLoan,
  returnStandbyLoan,
  listOverdueStandbyLoans,
  listStandbyLoansForTicket,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function makeLoan(overrides: Partial<Parameters<typeof createStandbyLoan>[0]> = {}) {
  return createStandbyLoan({
    entity_id: ENTITY,
    ticket_id: 'st-001',
    customer_id: 'CUST-001',
    loaner_serial: 'LN-SN-1',
    loaner_model: 'AC-Loaner-X',
    loaned_out_at: new Date().toISOString(),
    expected_return_date: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    daily_cost_paise: 50000,
    notes: '',
    created_by: 'desk_user',
    ...overrides,
  });
}

describe('StandbyLoan · OOB-18 revenue leak', () => {
  beforeEach(() => localStorage.clear());

  it('creates loan in out status with daily cost', () => {
    const l = makeLoan();
    expect(l.status).toBe('out');
    expect(l.daily_cost_paise).toBe(50000);
    expect(l.total_cost_paise).toBe(0);
  });

  it('returns loan with computed total + damage charge', () => {
    const l = makeLoan();
    const ret = returnStandbyLoan(l.id, 'agent', true, 200000, ENTITY);
    expect(ret.status).toBe('returned');
    expect(ret.damage_on_return).toBe(true);
    expect(ret.damage_charge_paise).toBe(200000);
    expect(ret.total_cost_paise).toBeGreaterThanOrEqual(50000 + 200000);
  });

  it('listOverdueStandbyLoans flags past-due', () => {
    makeLoan({ expected_return_date: new Date(Date.now() - 86400 * 1000).toISOString() });
    expect(listOverdueStandbyLoans(ENTITY)).toHaveLength(1);
  });

  it('listStandbyLoansForTicket scopes correctly', () => {
    makeLoan();
    makeLoan({ ticket_id: 'st-002' });
    expect(listStandbyLoansForTicket('st-001', ENTITY)).toHaveLength(1);
  });
});
