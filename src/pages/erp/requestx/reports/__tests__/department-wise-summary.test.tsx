import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DepartmentWiseSummaryPanel } from '../DepartmentWiseSummary';

describe('RPT-6b · rq-dept-summary (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><DepartmentWiseSummaryPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-dept-summary-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-dept-summary-integrity-badge')).toBeInTheDocument();
  });
});
