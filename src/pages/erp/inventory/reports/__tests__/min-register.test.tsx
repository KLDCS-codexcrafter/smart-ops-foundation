/**
 * @file min-register.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MINRegisterPanel } from '../MINRegister';

describe('RPT-5b · MINRegister wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<MINRegisterPanel />);
    expect(screen.getByTestId('inv-min-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-min-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the MIN Register heading', () => {
    render(<MINRegisterPanel />);
    expect(screen.getAllByText(/MIN Register/i).length).toBeGreaterThan(0);
  });
});
