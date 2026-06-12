import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectMarginReportPanel } from '../ProjectMarginReport';

describe('RPT-7b · px-margin (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><ProjectMarginReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('px-margin-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-margin-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('px-margin-chart-host')).toBeInTheDocument();
  });
});
