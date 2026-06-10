/**
 * @file import-po-list.test.tsx
 * @sprint RPT-2b-i · ImportPOList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ImportPOList } from '../import/ImportPOList';

const renderPage = () => render(<MemoryRouter><ImportPOList /></MemoryRouter>);

describe('RPT-2b-i · ImportPOList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Import Orders/i)).toBeInTheDocument();
  });
  it('preserves existing search input + New PO button', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Search PO/i)).toBeInTheDocument();
    expect(screen.getByText(/New Import PO/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-impo-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-impo-period-chip')).toBeInTheDocument();
  });
});
