import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AssetMasterExcelImportPanel } from '@/pages/erp/accounting/capital-assets/AssetMasterExcelImport';

describe('AssetMasterExcelImport', () => {
  it('renders without crashing', () => {
    const { container } = render(<AssetMasterExcelImportPanel entityCode="TEST" />);
    expect(container).toBeDefined();
  });

  it('renders XLSX format alert', () => {
    const { getByText } = render(<AssetMasterExcelImportPanel entityCode="TEST" />);
    expect(getByText(/Excel format/i)).toBeDefined();
  });
});
