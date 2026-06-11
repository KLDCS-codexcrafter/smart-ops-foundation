/**
 * @file fgr-insp-report.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FGRInspReport } from '../FGRInspReport';

describe('RPT-5d · FGRInspReport (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<FGRInspReport />);
    expect(screen.getByTestId('qc-fgr-insp-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-fgr-insp-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves FG Receiving Inspection heading', () => {
    render(<FGRInspReport />);
    expect(screen.getAllByText(/FG Receiving Inspection/i).length).toBeGreaterThanOrEqual(1);
  });
});
