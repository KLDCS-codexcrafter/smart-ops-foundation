import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PipelineSummaryPanel } from '../PipelineSummary';

describe('RPT-7b · sx-pipeline (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><PipelineSummaryPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-pipeline-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-pipeline-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
