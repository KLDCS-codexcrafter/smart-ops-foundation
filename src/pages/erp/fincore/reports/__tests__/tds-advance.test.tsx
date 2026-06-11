/**
 * @file tds-advance.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TDSAdvancePanel } from '../TDSAdvance';

describe('TDSAdvance (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge', () => {
    render(<TDSAdvancePanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-tds-advance-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-tds-advance-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-tds-advance-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the TDS Advance Tracking heading', () => {
    render(<TDSAdvancePanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/TDS Advance/i).length).toBeGreaterThan(0);
  });
});
