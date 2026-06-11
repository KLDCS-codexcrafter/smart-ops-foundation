/**
 * @file consumption-register.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsumptionRegisterPanel } from '../ConsumptionRegister';

describe('RPT-5b · ConsumptionRegister wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle (defaults to Table)', () => {
    render(<MemoryRouter><ConsumptionRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('inv-consumption-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-consumption-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('preserves the Consumption Register heading', () => {
    render(<MemoryRouter><ConsumptionRegisterPanel /></MemoryRouter>);
    expect(screen.getAllByText(/Consumption Register/i).length).toBeGreaterThan(0);
  });
});
