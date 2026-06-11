/**
 * @file stk-iqc-st-remarks.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StkIqcStRemarks } from '../StkIqcStRemarks';

describe('RPT-5d · StkIqcStRemarks (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<StkIqcStRemarks />);
    expect(screen.getByTestId('qc-iqc-remarks-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-iqc-remarks-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves QC Stock Remarks heading', () => {
    render(<StkIqcStRemarks />);
    expect(screen.getAllByText(/QC Stock Remarks/i).length).toBeGreaterThanOrEqual(1);
  });
});
