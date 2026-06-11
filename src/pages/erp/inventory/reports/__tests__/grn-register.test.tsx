/**
 * @file grn-register.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GRNRegisterPanel } from '../GRNRegister';

describe('RPT-5b · GRNRegister wrap', () => {
  it('renders heading and preserves existing structure', () => {
    render(<GRNRegisterPanel />);
    expect(screen.getAllByText(/GRN Register/i).length).toBeGreaterThan(0);
  });
  it('mounts toggle host + integrity badge + TableChartToggle defaulting to Table', () => {
    render(<GRNRegisterPanel />);
    expect(screen.getByTestId('inv-grn-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-grn-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
});
