/**
 * @file packing-credit-list.test.tsx
 * @sprint RPT-2b-ii · PackingCreditList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PackingCreditList from '../finance/PackingCreditList';

const renderPage = () => render(<MemoryRouter><PackingCreditList /></MemoryRouter>);

describe('RPT-2b-ii · PackingCreditList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Packing Credit/i)).toBeInTheDocument();
  });
  it('preserves existing "PC contracts" table card', () => {
    renderPage();
    expect(screen.getByText(/PC contracts/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-pc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-pc-period-chip')).toBeInTheDocument();
  });
});
