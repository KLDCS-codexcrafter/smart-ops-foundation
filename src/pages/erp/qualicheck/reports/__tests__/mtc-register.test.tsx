/**
 * @file mtc-register.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MtcRegister } from '../MtcRegister';

describe('RPT-5d · MtcRegister (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<MtcRegister />);
    expect(screen.getByTestId('qc-mtc-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-mtc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves MTC Register heading', () => {
    render(<MtcRegister />);
    expect(screen.getAllByText(/MTC Register/i).length).toBeGreaterThanOrEqual(1);
  });
});
