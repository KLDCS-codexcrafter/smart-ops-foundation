/**
 * @file boe-list.test.tsx
 * @sprint RPT-2b-i · BoEList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BoEList } from '../import/BoEList';

const renderPage = () => render(<MemoryRouter><BoEList /></MemoryRouter>);

describe('RPT-2b-i · BoEList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Bills of Entry/i)).toBeInTheDocument();
  });
  it('preserves existing BoE Register card', () => {
    renderPage();
    expect(screen.getByText(/BoE Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-boe-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-boe-period-chip')).toBeInTheDocument();
  });
});
