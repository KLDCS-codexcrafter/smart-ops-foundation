/**
 * @file        industrial-safety-dashboard.test.tsx
 * @sprint      RPT-2a-i (T2: robust)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IndustrialSafetyDashboardPage from '../IndustrialSafetyDashboardPage';

describe('RPT-2a-i · IndustrialSafetyDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<IndustrialSafetyDashboardPage />);
    expect(screen.getByRole('heading', { name: /Industrial Safety/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/PESO active/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<IndustrialSafetyDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-indsafety')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-indsafety-section')).toBeInTheDocument();
  });
});
