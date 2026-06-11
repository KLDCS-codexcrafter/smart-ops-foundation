/**
 * @file        RoleDashboard.test.tsx
 * @sprint      RPT-4 (+ T2 fix)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleDashboard } from '@/components/operix-core/report-framework/RoleDashboard';

vi.mock('@/hooks/useCardEntitlement', () => ({
  useCardEntitlement: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
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

  it('at management layer renders ≥1 ReportChart in the xc section', () => {
    mockRole('tenant_admin');
    render(<RoleDashboard />);
    const xcWrap = screen.getByTestId('role-dashboard-xc-charts');
    expect(xcWrap).toBeInTheDocument();
    const charts = xcWrap.querySelectorAll('[data-testid^="role-dashboard-xc-chart-"]');
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });

  it('at operator layer (view_only role) renders 0 xc charts', () => {
    mockRole('view_only');
    render(<RoleDashboard />);
    expect(screen.queryByTestId('role-dashboard-xc-charts')).not.toBeInTheDocument();
  });
});
