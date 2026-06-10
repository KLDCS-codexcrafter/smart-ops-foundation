/**
 * @file        mca-tier2-dashboard.test.tsx
 * @sprint      RPT-2a-ii · robust assertions (T2 lesson)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MCATier2DashboardPage from '../MCATier2DashboardPage';

describe('RPT-2a-ii · MCATier2DashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<MCATier2DashboardPage />);
    expect(screen.getByRole('heading', { name: /MCA Tier-2/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/CSR-2 Filed/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<MCATier2DashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-mca')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aii-mca-section')).toBeInTheDocument();
  });
});
