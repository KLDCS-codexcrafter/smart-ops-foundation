/**
 * @file        rms-declaration-dashboard.test.tsx
 * @sprint      RPT-2b-iv · header via getByRole heading
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RMSDeclarationDashboard } from '../RMSDeclarationDashboard';

describe('RPT-2b-iv · RMSDeclarationDashboard', () => {
  it('preserves existing header + tiles', () => {
    render(<RMSDeclarationDashboard />);
    expect(screen.getByRole('heading', { name: /RMS Declaration Dashboard/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Total RMS/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<RMSDeclarationDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-rms')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biv-rms-section')).toBeInTheDocument();
  });
});
