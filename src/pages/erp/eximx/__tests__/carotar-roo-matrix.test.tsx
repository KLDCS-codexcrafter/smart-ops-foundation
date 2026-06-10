/**
 * @file carotar-roo-matrix.test.tsx
 * @sprint RPT-2b-ii · CAROTARRoOMatrix wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CAROTARRoOMatrix } from '../compliance/CAROTARRoOMatrix';

const renderPage = () => render(<MemoryRouter><CAROTARRoOMatrix /></MemoryRouter>);

describe('RPT-2b-ii · CAROTARRoOMatrix', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/CAROTAR FULL/i)).toBeInTheDocument();
  });
  it('preserves existing "Supplier Declaration Register" table card', () => {
    renderPage();
    expect(screen.getByText(/Supplier Declaration Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-roo-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-roo-period-chip')).toBeInTheDocument();
  });
});
