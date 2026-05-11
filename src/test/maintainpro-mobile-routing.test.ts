/**
 * @file        src/test/maintainpro-mobile-routing.test.ts
 * @purpose     Mobile MaintainPro Technician landing + MobileRouter route + MOBILE_PRODUCTS entry tests
 * @sprint      T-Phase-1.A.16c · Block H.2 · NEW · Q-LOCK-12
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileMaintenanceTechnicianPage from '@/pages/mobile/MobileMaintenanceTechnicianPage';
import { MOBILE_PRODUCTS } from '@/config/mobile-products';

const W = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MobileMaintenanceTechnicianPage', () => {
  it('renders role label', () => {
    render(<W><MobileMaintenanceTechnicianPage /></W>);
    expect(screen.getByText('Maintenance Technician')).toBeTruthy();
  });
  it('renders 4 capture tile stubs with A.17 marker', () => {
    render(<W><MobileMaintenanceTechnicianPage /></W>);
    expect(screen.getByText('Capture Breakdown')).toBeTruthy();
    expect(screen.getByText('PM Tick-off')).toBeTruthy();
    expect(screen.getByText('Spares Issue')).toBeTruthy();
    expect(screen.getByText('Asset Photo')).toBeTruthy();
    expect(screen.getAllByText('Available at A.17').length).toBe(4);
  });
  it('renders 3 active summary tiles', () => {
    render(<W><MobileMaintenanceTechnicianPage /></W>);
    expect(screen.getByText('Active WOs')).toBeTruthy();
    expect(screen.getByText("Today's PMs")).toBeTruthy();
    expect(screen.getByText('Open Tickets')).toBeTruthy();
  });
});

describe('MOBILE_PRODUCTS registry', () => {
  it('includes maintainpro entry with maintenance_technician role', () => {
    const mp = MOBILE_PRODUCTS.find((p) => p.id === 'maintainpro');
    expect(mp).toBeDefined();
    expect(mp?.role).toBe('maintenance_technician');
    expect(mp?.landingPath).toBe('/operix-go/maintenance-technician');
  });
  it('includes sitex entry (precedent)', () => {
    expect(MOBILE_PRODUCTS.find((p) => p.id === 'sitex')).toBeDefined();
  });
  it('all entries have unique roles', () => {
    const roles = MOBILE_PRODUCTS.map((p) => p.role);
    expect(new Set(roles).size).toBe(roles.length);
  });
});
