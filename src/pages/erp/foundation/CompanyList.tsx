import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';

interface CompanyRow {
  id: string; code: string; shortCode: string; name: string;
  parentCompany: string; status: string; city: string; state: string; createdAt: string;
}

// [JWT] Replace with API call GET /api/foundation/companies
const MOCK_COMPANIES: CompanyRow[] = [
  { id: 'c1', code: 'SHTR001', shortCode: 'SHTR', name: 'Sharma Traders Pvt Ltd',
    parentCompany: 'SmartOps Industries Pvt Ltd', status: 'Active',
    city: 'Mumbai', state: 'Maharashtra', createdAt: '01 Apr 2025' },
  { id: 'c2', code: 'SMTN001', shortCode: 'SMTN', name: 'SmartOps North India Pvt Ltd',
    parentCompany: 'SmartOps Industries Pvt Ltd', status: 'Active',
    city: 'New Delhi', state: 'Delhi', createdAt: '15 Jun 2025' },
  { id: 'c3', code: 'SMEP001', shortCode: 'SMEP', name: 'SmartOps East Projects Ltd',
    parentCompany: 'SmartOps Industries Pvt Ltd', status: 'Under Formation',
    city: 'Kolkata', state: 'West Bengal', createdAt: '01 Jan 2026' },
];

const COLUMNS: ListColumn<CompanyRow>[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'shortCode', label: 'Short Code', render: r => <Badge variant="outline" className="text-[10px] font-mono">{r.shortCode}</Badge> },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'parentCompany', label: 'Parent Company', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'city', label: 'City', sortable: true },
  { key: 'state', label: 'State' },
];

export default function CompanyList() {
  return (
    <FoundationListPage<CompanyRow>
      title="Companies"
      description="Registered legal entities under the parent company."
      breadcrumbs={[
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: 'Foundation' },
        { label: 'Companies' },
      ]}
      createHref="/erp/foundation/companies/create"
      createLabel="Add Company"
      columns={COLUMNS}
      data={MOCK_COMPANIES}
      searchKeys={['name', 'code', 'shortCode', 'city']}
    />
  );
}
