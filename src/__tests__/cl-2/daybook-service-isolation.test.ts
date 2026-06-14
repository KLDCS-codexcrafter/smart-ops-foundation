/**
 * CL-2 · Block 1 · J5 cross-tenant bleed fix.
 * Two-tenant isolation: seed service tickets under entity A and entity B,
 * then read the sd-service-daybook source for A → must return ONLY A's
 * tickets. The pre-fix bug: read:() called listServiceTickets() unfiltered,
 * leaking B's rows into A's DayBook. Real isolation assertion.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '@/lib/report-framework/daybook-sources';
import { getDayBookSource } from '@/lib/report-framework/daybook-source-registry';
import { serviceTicketKey } from '@/types/service-ticket';

const A = 'TENANTA';
const B = 'TENANTB';

function seedTicket(entity: string, id: string, ticket_no: string): void {
  const key = serviceTicketKey(entity);
  const raw = localStorage.getItem(key);
  const list = raw ? JSON.parse(raw) : [];
  list.push({
    id,
    ticket_no,
    entity_id: entity,
    customer_id: `cust-${entity}`,
    raised_at: '2026-06-14T10:00:00.000Z',
    resolved_at: '2026-06-14T11:00:00.000Z',
    closed_at: '2026-06-14T12:00:00.000Z',
    status: 'closed',
  });
  localStorage.setItem(key, JSON.stringify(list));
}

describe('CL-2 · J5 cross-tenant bleed fix', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("A's read returns ONLY A's tickets — B's rows do not bleed", () => {
    seedTicket(A, 't-a-1', 'STA-001');
    seedTicket(A, 't-a-2', 'STA-002');
    seedTicket(B, 't-b-1', 'STB-001');
    seedTicket(B, 't-b-2', 'STB-002');
    seedTicket(B, 't-b-3', 'STB-003');

    const source = getDayBookSource('sd-service-daybook', 'service');
    expect(source).toBeTruthy();

    const rowsA = source!.read(A);
    const rowsB = source!.read(B);

    // A's read: 2 tickets × 3 events (raised+resolved+closed) = 6 rows, all referencing STA-*
    expect(rowsA.length).toBe(6);
    expect(rowsA.every(r => r.reference.startsWith('STA-'))).toBe(true);
    expect(rowsA.some(r => r.reference.startsWith('STB-'))).toBe(false);

    // B's read independent and complete
    expect(rowsB.length).toBe(9);
    expect(rowsB.every(r => r.reference.startsWith('STB-'))).toBe(true);
  });
});
