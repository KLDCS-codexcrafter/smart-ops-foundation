/**
 * @file        form-3ceb-dashboard.test.tsx
 * @sprint      RPT-2b-iii · robust assertions (h1 present)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Form3CEBDashboard from '../Form3CEBDashboard';

describe('RPT-2b-iii · Form3CEBDashboard', () => {
  it('preserves existing header + Section 92E surface', () => {
    render(<Form3CEBDashboard />);
    expect(screen.getByRole('heading', { name: /Form 3CEB/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Snapshot generation/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<Form3CEBDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-form3ceb')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-form3ceb-section')).toBeInTheDocument();
  });
});
