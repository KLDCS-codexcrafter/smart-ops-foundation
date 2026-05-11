/**
 * @file        src/test/maintainpro-mobile-routing.test.ts
 * @purpose     Mobile MaintainPro Technician landing + route registration + MOBILE_PRODUCTS entry tests
 * @sprint      T-Phase-1.A.16c · Block H.2 · NEW · Q-LOCK-12
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MOBILE_PRODUCTS } from '@/config/mobile-products';

const read = (p: string): string => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('MobileMaintenanceTechnicianPage source', () => {
  const src = read('src/pages/mobile/MobileMaintenanceTechnicianPage.tsx');
  it('renders Maintenance Technician role label', () => {
    expect(src).toMatch(/Maintenance Technician/);
  });
  it('has 4 capture tile stubs', () => {
    expect(src).toMatch(/Capture Breakdown/);
    expect(src).toMatch(/PM Tick-off/);
    expect(src).toMatch(/Spares Issue/);
    expect(src).toMatch(/Asset Photo/);
  });
  it('marks captures as Available at A.17', () => {
    expect(src).toMatch(/Available at A\.17/);
  });
  it('has 3 active summary tiles', () => {
    expect(src).toMatch(/Active WOs/);
    expect(src).toMatch(/Today's PMs/);
    expect(src).toMatch(/Open Tickets/);
  });
  it('uses engine list functions', () => {
    expect(src).toMatch(/listWorkOrders/);
    expect(src).toMatch(/listPMTickoffs/);
    expect(src).toMatch(/listInternalTickets/);
  });
});

describe('App.tsx route registration', () => {
  const src = read('src/App.tsx');
  it('lazy-imports MobileMaintenanceTechnicianPage', () => {
    expect(src).toMatch(/MobileMaintenanceTechnicianPage = lazy/);
  });
  it('registers /operix-go/maintenance-technician route', () => {
    expect(src).toMatch(/\/operix-go\/maintenance-technician/);
  });
});

describe('OperixGoPage redirect entry', () => {
  const src = read('src/pages/mobile/OperixGoPage.tsx');
  it('includes maintenance-technician redirect tile', () => {
    expect(src).toMatch(/maintenance-technician/);
  });
});

describe('MOBILE_PRODUCTS registry', () => {
  it('includes maintainpro entry with maintenance_technician role', () => {
    const mp = MOBILE_PRODUCTS.find((p) => p.id === 'maintainpro');
    expect(mp).toBeDefined();
    expect(mp?.role).toBe('maintenance_technician');
    expect(mp?.landingPath).toBe('/operix-go/maintenance-technician');
  });
  it('includes sitex entry (A.15b precedent)', () => {
    expect(MOBILE_PRODUCTS.find((p) => p.id === 'sitex')).toBeDefined();
  });
  it('all entries have unique roles', () => {
    const roles = MOBILE_PRODUCTS.map((p) => p.role);
    expect(new Set(roles).size).toBe(roles.length);
  });
  it('all entries have unique ids', () => {
    const ids = MOBILE_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
