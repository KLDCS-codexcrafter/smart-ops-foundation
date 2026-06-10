/**
 * @file        fire-safety-dashboard.test.tsx
 * @sprint      RPT-2a-i · per-dashboard assertions (T2: robust)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FireSafetyDashboardPage from '../FireSafetyDashboardPage';

describe('RPT-2a-i · FireSafetyDashboardPage', () => {
  it('renders existing header + summary tiles preserved', () => {
    render(<FireSafetyDashboardPage />);
    expect(screen.getByRole('heading', { name: /Fire Safety/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Active Fire NOCs/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<FireSafetyDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-fire')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-fire-section')).toBeInTheDocument();
  });
});
