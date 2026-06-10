/**
 * @file        fire-safety-dashboard.test.tsx
 * @sprint      RPT-2a-i · per-dashboard assertions
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FireSafetyDashboardPage from '../FireSafetyDashboardPage';

describe('RPT-2a-i · FireSafetyDashboardPage', () => {
  it('renders existing header + summary tiles preserved', () => {
    render(<FireSafetyDashboardPage />);
    expect(screen.getByText(/Fire Safety/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Fire NOCs/i)).toBeInTheDocument();
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<FireSafetyDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-fire')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-fire-section')).toBeInTheDocument();
  });
});
