/**
 * @file        legal-ipr-dashboard.test.tsx
 * @sprint      RPT-2a-iii · robust assertions
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LegalIPRDashboardPage from '../LegalIPRDashboardPage';

describe('RPT-2a-iii · LegalIPRDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<LegalIPRDashboardPage />);
    expect(screen.getByRole('heading', { name: /Legal \+ IPR/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Active Contracts/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<LegalIPRDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-legal')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aiii-legal-section')).toBeInTheDocument();
  });
});
