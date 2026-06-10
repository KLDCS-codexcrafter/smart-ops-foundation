/**
 * @file        aeo-benefits-dashboard.test.tsx
 * @sprint      RPT-2b-iii · robust assertions (no h1 — queryAllByText)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AEOBenefitsDashboard } from '../AEOBenefitsDashboard';

describe('RPT-2b-iii · AEOBenefitsDashboard', () => {
  it('preserves existing header + tiles (no h1 — title via queryAllByText)', () => {
    render(<AEOBenefitsDashboard />);
    expect(screen.queryAllByText(/AEO FULL Benefits/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Tier Benefits Reference/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<AEOBenefitsDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-aeo')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-aeo-section')).toBeInTheDocument();
  });
});
