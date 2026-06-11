/**
 * @file qc-godown-summary.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QCGodownSummary } from '../QCGodownSummary';

describe('RPT-5d · QCGodownSummary (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<QCGodownSummary />);
    expect(screen.getByTestId('qc-godown-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-godown-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves QC Godown Summary heading', () => {
    render(<QCGodownSummary />);
    expect(screen.getAllByText(/QC Godown Summary/i).length).toBeGreaterThanOrEqual(1);
  });
});
