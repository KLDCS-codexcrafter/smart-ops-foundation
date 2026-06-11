/**
 * @file challan-register.test.tsx — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChallanRegisterPanel } from '../ChallanRegister';

describe('ChallanRegister (RPT-2e-iii wrap)', () => {
  it('mounts toggle host + period + integrity badge', () => {
    render(<ChallanRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-challan-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-challan-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-challan-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the heading', () => {
    render(<ChallanRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/Challan Register/i).length).toBeGreaterThan(0);
  });
});
