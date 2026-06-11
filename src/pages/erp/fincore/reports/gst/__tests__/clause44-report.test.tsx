/**
 * @file clause44-report.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Clause44ReportPanel } from '../Clause44Report';

describe('Clause44Report (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge', () => {
    render(<Clause44ReportPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-clause44-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-clause44-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-clause44-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the Clause 44 heading', () => {
    render(<Clause44ReportPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/Clause 44/i).length).toBeGreaterThan(0);
  });
});
