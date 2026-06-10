/**
 * @file hedge-contract-list.test.tsx
 * @sprint RPT-2b-ii · HedgeContractList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HedgeContractList } from '../finance/HedgeContractList';

const renderPage = () => render(<MemoryRouter><HedgeContractList /></MemoryRouter>);

describe('RPT-2b-ii · HedgeContractList', () => {
  it('renders existing "Hedge Contracts" card', () => {
    renderPage();
    expect(screen.getByText(/^Hedge Contracts$/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-hedge-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-hedge-period-chip')).toBeInTheDocument();
  });
});
