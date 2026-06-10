/**
 * @file        cross-entity-realisation-dashboard.test.tsx
 * @sprint      RPT-2b-iii · EximX cohort-1 · robust assertions (h1 present)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrossEntityRealisationDashboard from '../CrossEntityRealisationDashboard';

describe('RPT-2b-iii · CrossEntityRealisationDashboard', () => {
  it('preserves existing header + tiles', () => {
    render(<CrossEntityRealisationDashboard />);
    expect(screen.getByRole('heading', { name: /Cross-Entity Realisation/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Entities aggregated/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<CrossEntityRealisationDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-cross-realisation')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-cross-realisation-section')).toBeInTheDocument();
  });
});
