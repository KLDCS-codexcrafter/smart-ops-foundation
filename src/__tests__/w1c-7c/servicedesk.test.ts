import { describe, it, expect } from 'vitest';
import { serviceTicketKey } from '@/types/service-ticket';
import { amcRecordKey } from '@/types/servicedesk';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · ServiceDesk seed', () => {
  setupFreshSeed();
  it('seeds tickets and AMC records linked together', () => {
    const tickets = readKey<{ amc_record_id: string | null }>(serviceTicketKey(ENTITY));
    const amcs = readKey<{ id: string }>(amcRecordKey(ENTITY));
    expect(tickets.length).toBeGreaterThan(0);
    expect(amcs.length).toBeGreaterThan(0);
    expect(tickets[0].amc_record_id).toBe(amcs[0].id);
  });
});
