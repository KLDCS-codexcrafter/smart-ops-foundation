import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MultiGAAPDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/MultiGAAPDepreciationReport';

describe('MultiGAAPDepreciationReport', () => {
  it('renders without crashing', () => {
    const { container } = render(<MultiGAAPDepreciationReportPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders 4 tabs', () => {
    const { getAllByText } = render(<MultiGAAPDepreciationReportPanel entityCode="TEST" />);
    expect(getAllByText(/IT Act/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Companies Act/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Ind AS/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Reconciliation/i).length).toBeGreaterThan(0);
  });
});
