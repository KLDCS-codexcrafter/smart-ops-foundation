/**
 * @file ci-list.test.tsx
 * @sprint RPT-2b-i · CIList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CIList } from '../import/CIList';

const renderPage = () => render(<MemoryRouter><CIList /></MemoryRouter>);

describe('RPT-2b-i · CIList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Commercial Invoices/i)).toBeInTheDocument();
  });
  it('preserves existing search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Search CI/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-ci-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-ci-period-chip')).toBeInTheDocument();
  });
});
