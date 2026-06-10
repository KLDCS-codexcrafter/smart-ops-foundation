/**
 * @file multi-leg-git-list.test.tsx
 * @sprint RPT-2b-ii · MultiLegGITList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MultiLegGITList } from '../import/MultiLegGITList';

const renderPage = () => render(<MemoryRouter><MultiLegGITList /></MemoryRouter>);

describe('RPT-2b-ii · MultiLegGITList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Shipments \+ Multi-Leg GIT/i)).toBeInTheDocument();
  });
  it('preserves existing search input + table headers', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Search MLGIT/i)).toBeInTheDocument();
    expect(screen.getByText(/MLGIT No/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-git-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-git-period-chip')).toBeInTheDocument();
  });
});
