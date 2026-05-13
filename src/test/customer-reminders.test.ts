/**
 * @file        src/test/customer-reminders.test.ts
 * @sprint      T-Phase-1.C.1e · Block I.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCustomerReminder,
  fireReminderNow,
  snoozeReminder,
  dismissReminder,
  listUpcomingReminders,
  listAllRemindersForCustomer,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function makeInput(over: Partial<Parameters<typeof createCustomerReminder>[0]> = {}) {
  return {
    entity_id: ENTITY,
    customer_id: 'C-1',
    reminder_type: 'birthday' as const,
    trigger_date: new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10),
    advance_days: 3,
    template_id: null,
    notes: '',
    created_by: 'tester',
    ...over,
  };
}

beforeEach(() => localStorage.clear());

describe('CustomerReminder', () => {
  it('createCustomerReminder persists with status pending', () => {
    const r = createCustomerReminder(makeInput());
    expect(r.status).toBe('pending');
    expect(r.id).toBeTruthy();
  });

  it('supports 4 reminder_types', () => {
    for (const t of ['birthday', 'amc_anniversary', 'service_anniversary', 'custom'] as const) {
      const r = createCustomerReminder(makeInput({ reminder_type: t }));
      expect(r.reminder_type).toBe(t);
    }
  });

  it('fireReminderNow → status fired + channel recorded', () => {
    const r = createCustomerReminder(makeInput());
    const fired = fireReminderNow(r.id, 'tester', 'in_app', ENTITY);
    expect(fired.status).toBe('fired');
    expect(fired.fired_via_channel).toBe('in_app');
    expect(fired.fired_at).toBeTruthy();
  });

  it('fireReminderNow with email + template_id triggers FR-75 emit (no throw)', () => {
    const r = createCustomerReminder(makeInput({ template_id: 'TPL-1' }));
    expect(() => fireReminderNow(r.id, 'tester', 'email', ENTITY)).not.toThrow();
  });

  it('snoozeReminder transitions to snoozed', () => {
    const r = createCustomerReminder(makeInput());
    const s = snoozeReminder(r.id, 'tester', new Date(Date.now() + 86400_000).toISOString(), ENTITY);
    expect(s.status).toBe('snoozed');
    expect(s.snoozed_until).toBeTruthy();
  });

  it('dismissReminder transitions to dismissed', () => {
    const r = createCustomerReminder(makeInput());
    const d = dismissReminder(r.id, 'tester', 'duplicate', ENTITY);
    expect(d.status).toBe('dismissed');
  });

  it('listUpcomingReminders filters pending only and sorts by trigger_date', () => {
    createCustomerReminder(makeInput({ trigger_date: '2030-12-01' }));
    const r2 = createCustomerReminder(makeInput({ trigger_date: '2027-01-01' }));
    dismissReminder(r2.id, 'tester', 'x', ENTITY);
    const up = listUpcomingReminders(365 * 10, ENTITY);
    expect(up.length).toBe(1);
    expect(up[0].trigger_date).toBe('2030-12-01');
  });

  it('listAllRemindersForCustomer filters by customer', () => {
    createCustomerReminder(makeInput({ customer_id: 'C-1' }));
    createCustomerReminder(makeInput({ customer_id: 'C-2' }));
    expect(listAllRemindersForCustomer('C-1', ENTITY).length).toBe(1);
  });
});
