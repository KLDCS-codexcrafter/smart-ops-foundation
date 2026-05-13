/**
 * @file        src/test/repair-route-4way.test.ts
 * @purpose     4-Way Repair Routing CRUD + lifecycle + bridge emission
 * @sprint      T-Phase-1.C.1c · Block H.2
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRepairRoute,
  markRouteInRepair,
  markReturnedFromRepair,
  markRouteRejected,
  listRoutesForTicket,
  listRepairRoutes,
} from '@/lib/servicedesk-engine';
import { emitServiceTicketToMaintainPro } from '@/lib/servicedesk-bridges';

const ENTITY = 'OPRX';

function makeRoute(route_type: 'in_house' | 'manufacturer' | 'third_party' | 'service_centre') {
  return createRepairRoute({
    entity_id: ENTITY,
    ticket_id: 'st-001',
    route_type,
    route_partner_id: 'P-1',
    partner_name: 'Acme Repairs',
    repair_out_at: new Date().toISOString(),
    expected_return_at: null,
    cost_paise: 0,
    rejection_reason: '',
    notes: '',
    created_by: 'desk_user',
  });
}

describe('RepairRoute · 4 routes lifecycle', () => {
  beforeEach(() => localStorage.clear());

  it('routes through all 4 types', () => {
    const types: Array<'in_house' | 'manufacturer' | 'third_party' | 'service_centre'> = [
      'in_house', 'manufacturer', 'third_party', 'service_centre',
    ];
    types.forEach((t) => {
      const r = makeRoute(t);
      expect(r.status).toBe('routed');
      expect(r.route_type).toBe(t);
    });
    expect(listRepairRoutes({ entity_id: ENTITY })).toHaveLength(4);
  });

  it('lifecycle routed → in_repair → returned with turnaround', () => {
    const r = makeRoute('manufacturer');
    const inRep = markRouteInRepair(r.id, 'agent', ENTITY);
    expect(inRep.status).toBe('in_repair');
    const ret = markReturnedFromRepair(r.id, 'agent', 50000, ENTITY);
    expect(ret.status).toBe('returned');
    expect(ret.cost_paise).toBe(50000);
    expect(ret.turnaround_days).toBeGreaterThanOrEqual(0);
  });

  it('rejected route stores reason', () => {
    const r = makeRoute('third_party');
    const rej = markRouteRejected(r.id, 'agent', 'OEM declined warranty', ENTITY);
    expect(rej.status).toBe('rejected');
    expect(rej.rejection_reason).toContain('OEM');
  });

  it('listRoutesForTicket scopes correctly', () => {
    makeRoute('in_house');
    makeRoute('service_centre');
    expect(listRoutesForTicket('st-001', ENTITY)).toHaveLength(2);
  });

  it('D-NEW-DJ 4th consumer · MaintainPro bridge stub round-trip', () => {
    const ev = emitServiceTicketToMaintainPro({
      service_ticket_id: 'st-001',
      service_ticket_no: 'ST/OPRX/000001',
      customer_id: 'CUST-001',
      equipment_serial: 'SN-X-1',
      category: 'AC',
      severity: 'sev2_high',
    });
    expect(ev.type).toBe('servicedesk:service_ticket.route_in_house');
    expect(ev.originating_card_id).toBe('servicedesk');
  });
});
