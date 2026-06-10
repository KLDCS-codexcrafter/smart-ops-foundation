/**
 * @file        cost-audit-dashboard.test.tsx
 * @sprint      RPT-2a-i (T2: robust)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CostAuditDashboardPage from '../CostAuditDashboardPage';

describe('RPT-2a-i · CostAuditDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<CostAuditDashboardPage />);
    expect(screen.getByRole('heading', { name: /Cost Audit/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Adverse findings/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<CostAuditDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-costaudit')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-costaudit-section')).toBeInTheDocument();
  });
});
