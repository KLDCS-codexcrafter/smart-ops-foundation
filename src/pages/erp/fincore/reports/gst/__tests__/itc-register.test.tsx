/**
 * @file itc-register.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ITCRegisterPanel } from '../ITCRegister';

describe('ITCRegister (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge', () => {
    render(<ITCRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-itc-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-itc-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-itc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the existing ITC Register heading', () => {
    render(<ITCRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/ITC Register/i).length).toBeGreaterThan(0);
  });
});
