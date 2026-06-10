/**
 * @file export-realisation-list.test.tsx
 * @sprint RPT-2b-ii · ExportRealisationList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExportRealisationList } from '../export/ExportRealisationList';

const renderPage = () => render(<MemoryRouter><ExportRealisationList /></MemoryRouter>);

describe('RPT-2b-ii · ExportRealisationList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Export Realisations/i)).toBeInTheDocument();
  });
  it('preserves existing "Realisation Register" table card', () => {
    renderPage();
    expect(screen.getByText(/Realisation Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-realisation-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-realisation-period-chip')).toBeInTheDocument();
  });
});
