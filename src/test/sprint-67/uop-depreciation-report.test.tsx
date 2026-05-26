import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UOPDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/UOPDepreciationReport';

describe('UOPDepreciationReport', () => {
  it('renders without crashing', () => {
    const { container } = render(<UOPDepreciationReportPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders title', () => {
    const { getByText } = render(<UOPDepreciationReportPanel entityCode="TEST" />);
    expect(getByText(/UOP Depreciation Report/i)).toBeDefined();
  });
});
