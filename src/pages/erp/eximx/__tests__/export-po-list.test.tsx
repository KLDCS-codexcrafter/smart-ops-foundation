/**
 * @file export-po-list.test.tsx
 * @sprint RPT-2b-i · ExportPOList wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExportPOList } from '../export/ExportPOList';

const renderPage = () => render(<MemoryRouter><ExportPOList /></MemoryRouter>);

describe('RPT-2b-i · ExportPOList', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/Export Purchase Orders/i)).toBeInTheDocument();
  });
  it('preserves existing Export PO Register card', () => {
    renderPage();
    expect(screen.getByText(/Export PO Register/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-expo-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-expo-period-chip')).toBeInTheDocument();
  });
});
