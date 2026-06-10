/**
 * @file shipping-bill-list.test.tsx
 * @sprint RPT-2b-i · ShippingBillList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShippingBillList } from '../export/ShippingBillList';

const renderPage = () => render(<MemoryRouter><ShippingBillList /></MemoryRouter>);

describe('RPT-2b-i · ShippingBillList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Shipping Bills/i)).toBeInTheDocument();
  });
  it('preserves existing SB Register card', () => {
    renderPage();
    expect(screen.getByText(/SB Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-sb-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-sb-period-chip')).toBeInTheDocument();
  });
});
