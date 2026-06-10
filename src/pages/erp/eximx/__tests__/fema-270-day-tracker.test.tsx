/**
 * @file fema-270-day-tracker.test.tsx
 * @sprint RPT-2b-ii · FEMA270DayTracker wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FEMA270DayTracker } from '../export/FEMA270DayTracker';

const renderPage = () => render(<MemoryRouter><FEMA270DayTracker /></MemoryRouter>);

describe('RPT-2b-ii · FEMA270DayTracker', () => {
  it('renders heading', () => {
    renderPage();
    expect(screen.getByText(/FEMA 270-Day Tracker/i)).toBeInTheDocument();
  });
  it('preserves existing day-band reference + by-state table', () => {
    renderPage();
    expect(screen.getByText(/FEMA Day-Band Reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Realisations by FEMA State/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    renderPage();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    renderPage();
    expect(screen.getByTestId('ex-fema-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ex-fema-period-chip')).toBeInTheDocument();
  });
});
