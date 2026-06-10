/**
 * @file        survival-kit-dashboard.test.tsx
 * @sprint      RPT-2a-iii · robust assertions
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SurvivalKitDashboardPage from '../SurvivalKitDashboardPage';

describe('RPT-2a-iii · SurvivalKitDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<SurvivalKitDashboardPage />);
    expect(screen.getByRole('heading', { name: /Auditor Survival Kit/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Checklist items/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<SurvivalKitDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-survivalkit')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aiii-survivalkit-section')).toBeInTheDocument();
  });
});
