/**
 * @file rtv-register.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RTVRegisterPanel } from '../RTVRegister';

describe('RPT-5b · RTVRegister wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<RTVRegisterPanel />);
    expect(screen.getByTestId('inv-rtv-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-rtv-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the RTV Register heading', () => {
    render(<RTVRegisterPanel />);
    expect(screen.getAllByText(/RTV Register/i).length).toBeGreaterThan(0);
  });
});
