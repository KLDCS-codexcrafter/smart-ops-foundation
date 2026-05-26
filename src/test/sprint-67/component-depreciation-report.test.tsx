import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ComponentDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/ComponentDepreciationReport';

describe('ComponentDepreciationReport', () => {
  it('renders without crashing', () => {
    const { container } = render(<ComponentDepreciationReportPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders title', () => {
    const { getByText } = render(<ComponentDepreciationReportPanel entityCode="TEST" />);
    expect(getByText(/Component Depreciation Report/i)).toBeDefined();
  });
});
