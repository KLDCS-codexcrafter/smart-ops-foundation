import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OpeningDepreciationMigrationToolPanel } from '@/pages/erp/accounting/capital-assets/OpeningDepreciationMigrationTool';

describe('OpeningDepreciationMigrationTool', () => {
  it('renders without crashing', () => {
    const { container } = render(<OpeningDepreciationMigrationToolPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders CSV format alert', () => {
    const { getByText } = render(<OpeningDepreciationMigrationToolPanel entityCode="TEST" />);
    expect(getByText(/CSV format/i)).toBeDefined();
  });
});
