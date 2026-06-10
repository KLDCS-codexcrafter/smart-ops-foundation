/**
 * @file        quality-standards-dashboard.test.tsx
 * @sprint      RPT-2a-ii · robust assertions (T2 lesson)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QualityStandardsDashboardPage from '../QualityStandardsDashboardPage';

describe('RPT-2a-ii · QualityStandardsDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<QualityStandardsDashboardPage />);
    expect(screen.getByRole('heading', { name: /Quality & Standards/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/FSSAI Active/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<QualityStandardsDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-quality')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aii-quality-section')).toBeInTheDocument();
  });
});
