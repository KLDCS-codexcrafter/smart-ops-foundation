/**
 * @file        ebrc-edpms-dashboard.test.tsx
 * @sprint      RPT-2b-iii · robust assertions (h1 present)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EBRCEDPMSDashboard } from '../EBRCEDPMSDashboard';

describe('RPT-2b-iii · EBRCEDPMSDashboard', () => {
  it('preserves existing header + EBRC/EDPMS registers', () => {
    render(<EBRCEDPMSDashboard />);
    expect(screen.getByRole('heading', { name: /e-BRC \+ EDPMS Reconciliation/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/EBRC Register/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<EBRCEDPMSDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-ebrc')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biii-ebrc-section')).toBeInTheDocument();
  });
});
