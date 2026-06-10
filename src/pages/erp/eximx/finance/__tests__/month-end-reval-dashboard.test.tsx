/**
 * @file        month-end-reval-dashboard.test.tsx
 * @sprint      RPT-2b-iii · robust assertions (no h1 — queryAllByText)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthEndRevalDashboard } from '../MonthEndRevalDashboard';

describe('RPT-2b-iii · MonthEndRevalDashboard', () => {
  it('preserves existing header + tiles (no h1 — title via queryAllByText)', () => {
    render(<MonthEndRevalDashboard />);
    expect(screen.queryAllByText(/Month-End Revaluation/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Pending Reval/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<MonthEndRevalDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-monthend-reval')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-monthend-reval-section')).toBeInTheDocument();
  });
});
