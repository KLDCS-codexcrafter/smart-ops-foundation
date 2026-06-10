/**
 * @file export-dispatch-list.test.tsx
 * @sprint RPT-2b-i · ExportDispatchList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExportDispatchList } from '../export/ExportDispatchList';

const renderPage = () => render(<MemoryRouter><ExportDispatchList /></MemoryRouter>);

describe('RPT-2b-i · ExportDispatchList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Export Dispatches/i)).toBeInTheDocument();
  });
  it('preserves existing Dispatch Register card', () => {
    renderPage();
    expect(screen.getByText(/Dispatch Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-disp-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-disp-period-chip')).toBeInTheDocument();
  });
});
