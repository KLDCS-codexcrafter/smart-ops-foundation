/**
 * @file        environmental-dashboard.test.tsx
 * @sprint      RPT-2a-i
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnvironmentalDashboardPage from '../EnvironmentalDashboardPage';

describe('RPT-2a-i · EnvironmentalDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<EnvironmentalDashboardPage />);
    expect(screen.getByText(/Environmental Compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/Active CTE/i)).toBeInTheDocument();
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<EnvironmentalDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-env')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-env-section')).toBeInTheDocument();
  });
});
