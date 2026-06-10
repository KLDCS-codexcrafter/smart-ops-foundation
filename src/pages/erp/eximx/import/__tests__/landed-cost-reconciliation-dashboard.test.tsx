/**
 * @file        landed-cost-reconciliation-dashboard.test.tsx
 * @sprint      RPT-2b-iii · robust assertions (no h1 — queryAllByText)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandedCostReconciliationDashboard } from '../LandedCostReconciliationDashboard';

describe('RPT-2b-iii · LandedCostReconciliationDashboard', () => {
  it('preserves existing header + tiles (no h1 — title via queryAllByText)', () => {
    render(<LandedCostReconciliationDashboard />);
    expect(screen.queryAllByText(/Replayable Landed Cost Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Total Booked/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<LandedCostReconciliationDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-landed-cost')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-landed-cost-section')).toBeInTheDocument();
  });
});
