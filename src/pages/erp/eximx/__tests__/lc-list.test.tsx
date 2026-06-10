/**
 * @file lc-list.test.tsx
 * @sprint RPT-2b-i · LCList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LCList from '../finance/LCList';

const renderPage = () => render(<MemoryRouter><LCList /></MemoryRouter>);

describe('RPT-2b-i · LCList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Letters of Credit/i)).toBeInTheDocument();
  });
  it('preserves existing "LC contracts" table card', () => {
    renderPage();
    expect(screen.getByText(/LC contracts/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-lc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-lc-period-chip')).toBeInTheDocument();
  });
});
