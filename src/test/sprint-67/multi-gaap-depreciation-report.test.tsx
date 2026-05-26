import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MultiGAAPDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/MultiGAAPDepreciationReport';

describe('MultiGAAPDepreciationReport', () => {
  it('renders without crashing', () => {
    const { container } = render(<MultiGAAPDepreciationReportPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders 4 tabs', () => {
    const { getByText } = render(<MultiGAAPDepreciationReportPanel entityCode="TEST" />);
    expect(getByText(/IT Act/i)).toBeDefined();
    expect(getByText(/Companies Act/i)).toBeDefined();
    expect(getByText(/Ind AS/i)).toBeDefined();
    expect(getByText(/Reconciliation/i)).toBeDefined();
  });
});
