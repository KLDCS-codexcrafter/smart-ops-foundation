import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DepartmentConsumptionSummaryPanel } from '../DepartmentConsumptionSummary';

describe('RPT-6b · st-dept-consumption (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><DepartmentConsumptionSummaryPanel /></MemoryRouter>);
    expect(screen.getByTestId('st-dept-consumption-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('st-dept-consumption-integrity-badge')).toBeInTheDocument();
  });
});
