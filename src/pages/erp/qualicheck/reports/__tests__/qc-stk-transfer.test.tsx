/**
 * @file qc-stk-transfer.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QCStkTrnsfer } from '../QCStkTrnsfer';

describe('RPT-5d · QCStkTrnsfer (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<QCStkTrnsfer />);
    expect(screen.getByTestId('qc-stk-transfer-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-stk-transfer-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves QC Stock Transfer heading', () => {
    render(<QCStkTrnsfer />);
    expect(screen.getAllByText(/QC Stock Transfer/i).length).toBeGreaterThanOrEqual(1);
  });
});
