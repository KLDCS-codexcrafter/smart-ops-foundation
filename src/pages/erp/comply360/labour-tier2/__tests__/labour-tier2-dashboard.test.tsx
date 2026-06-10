/**
 * @file        labour-tier2-dashboard.test.tsx
 * @sprint      RPT-2a-ii · robust assertions (T2 lesson)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LabourTier2DashboardPage from '../LabourTier2DashboardPage';

describe('RPT-2a-ii · LabourTier2DashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<LabourTier2DashboardPage />);
    expect(screen.getByRole('heading', { name: /Labour Tier-2/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Bonus Computed/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<LabourTier2DashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-labour')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aii-labour-section')).toBeInTheDocument();
  });
});
