import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoverageReportPanel } from '../CoverageReport';

describe('RPT-7b · sx-coverage (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><CoverageReportPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-coverage-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-coverage-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
