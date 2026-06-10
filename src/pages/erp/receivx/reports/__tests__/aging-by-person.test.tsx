/**
 * @file aging-by-person.test.tsx
 * @sprint RPT-2c · AgingByPerson wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgingByPersonPanel } from '../AgingByPerson';

describe('RPT-2c · AgingByPersonPanel', () => {
  it('renders header', () => {
    render(<AgingByPersonPanel entityCode="E1" personType="salesman" />);
    expect(screen.getByText(/Aging by salesman/i)).toBeInTheDocument();
  });
  it('preserves existing Export CSV button', () => {
    render(<AgingByPersonPanel entityCode="E1" personType="salesman" />);
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<AgingByPersonPanel entityCode="E1" personType="salesman" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<AgingByPersonPanel entityCode="E1" personType="salesman" />);
    expect(screen.getByTestId('rx-agp-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('rx-agp-period-chip')).toBeInTheDocument();
  });
});
