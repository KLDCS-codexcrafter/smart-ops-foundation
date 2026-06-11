/**
 * @file qc-rejection-analysis.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QcRejectionAnalysis } from '../QcRejectionAnalysis';

describe('RPT-5d · QcRejectionAnalysis (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<QcRejectionAnalysis />);
    expect(screen.getByTestId('qc-rejection-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-rejection-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves Rejection Analysis heading', () => {
    render(<QcRejectionAnalysis />);
    expect(screen.getAllByText(/Rejection Analysis/i).length).toBeGreaterThanOrEqual(1);
  });
});
