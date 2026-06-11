/**
 * @file        RoleDashboard.test.tsx
 * @sprint      RPT-4 (+ T2 + T3 fixes)
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { RoleDashboard } from '@/components/operix-core/report-framework/RoleDashboard';
import {
  registerSource,
  __resetDataSourceCatalogForTests,
} from '@/lib/report-framework/data-source-catalog';

vi.mock('@/hooks/useCardEntitlement', () => ({
  useCardEntitlement: vi.fn(),
}));
vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'TEST', entityId: 'test' }),
}));

const { useCardEntitlement } = await import('@/hooks/useCardEntitlement') as {
  useCardEntitlement: ReturnType<typeof vi.fn>;
};

const ALL_CARDS = ['fincore', 'receivx', 'payout', 'eximx', 'comply360'];

function mockRole(role: string) {
  useCardEntitlement.mockReturnValue({
    profile: { role },
    allowedCards: ALL_CARDS,
    entitlements: [],
    canAccess: () => true,
  });
}

describe('RPT-4 · RoleDashboard component', () => {
  it('renders the My Dashboard heading and the three layer chips', () => {
    mockRole('tenant_admin');
    render(<RoleDashboard />);
    expect(screen.getByRole('heading', { name: /My Dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-operator')).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-manager')).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-management')).toBeInTheDocument();
  });

  it('at operator layer (view_only role) renders 0 xc charts', () => {
    mockRole('view_only');
    render(<RoleDashboard />);
    expect(screen.queryByTestId('role-dashboard-xc-charts')).not.toBeInTheDocument();
  });

  it('T3 · empty/unresolved DSC sources render an honest empty-state (no fabricated data)', () => {
    __resetDataSourceCatalogForTests();
    mockRole('tenant_admin');
    render(<RoleDashboard />);
    const xcWrap = screen.getByTestId('role-dashboard-xc-charts');
    expect(xcWrap).toBeInTheDocument();
    // With an empty catalog, every xc KPI must show the empty-state text.
    const empties = screen.queryAllByText(/No data yet for this KPI/i);
    expect(empties.length).toBeGreaterThan(0);
  });

  it('T3 · charts render ONLY when the DSC source returns rows', () => {
    __resetDataSourceCatalogForTests();
    // Provide real rows for one xc KPI's dataSource id.
    registerSource({
      id: 'reg:fc-ledger',
      label: 'FC Ledger',
      card: 'fincore',
      kind: 'register',
      fields: [
        { key: 'date', label: 'Date', kind: 'dimension' },
        { key: 'balance', label: 'Balance', kind: 'measure' },
      ],
      read: () => [
        { date: '2026-01-01', balance: 100 },
        { date: '2026-02-01', balance: 200 },
      ],
    });
    mockRole('tenant_admin');
    render(<RoleDashboard />);
    // xc-cash-position has dataSource 'reg:fc-ledger' → should have a chart (no empty-state).
    expect(
      screen.queryByTestId('role-dashboard-xc-empty-xc-cash-position'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('role-dashboard-xc-chart-xc-cash-position'),
    ).toBeInTheDocument();
  });

  it('T3 · placeholderDataFor is removed from RoleDashboard source', () => {
    const src = readFileSync(
      resolve(__dirname, '../RoleDashboard.tsx'),
      'utf-8',
    );
    expect(src).not.toMatch(/placeholderDataFor/);
  });
});
