import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BeatProductivityReportPanel } from '../BeatProductivityReport';

describe('RPT-7b · sx-beat (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><BeatProductivityReportPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-beat-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-beat-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
