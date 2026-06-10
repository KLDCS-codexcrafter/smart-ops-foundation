/**
 * @file        csr-dashboard.test.tsx
 * @sprint      RPT-2a-ii · robust assertions (T2 lesson)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CSRDashboardPage from '../CSRDashboardPage';

describe('RPT-2a-ii · CSRDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<CSRDashboardPage />);
    expect(screen.getByRole('heading', { name: /CSR/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Implementing Agencies/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<CSRDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-csr')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aii-csr-section')).toBeInTheDocument();
  });
});
