import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChurnRiskReportPanel } from '../ChurnRiskReport';

describe('RPT-7c · cu-churn (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><ChurnRiskReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('cu-churn-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('cu-churn-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('cu-churn-chart-host')).toBeInTheDocument();
  });
});
