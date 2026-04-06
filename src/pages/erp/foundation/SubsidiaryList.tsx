import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';

interface SubsidiaryRow {
  id: string; code: string; name: string;
  parentCompany: string; ownershipPct: string;
  relationship: string; status: string; city: string;
}

// [JWT] Replace with API call GET /api/foundation/subsidiaries
const MOCK_SUBSIDIARIES: SubsidiaryRow[] = [
  { id: 's1', code: 'SUB001', name: 'SmartOps Tech Solutions Ltd',
    parentCompany: 'SmartOps Industries Pvt Ltd', ownershipPct: '100%',
    relationship: 'Wholly Owned Subsidiary', status: 'Active', city: 'Bengaluru' },
  { id: 's2', code: 'SUB002', name: 'SmartOps Finance Services Ltd',
    parentCompany: 'SmartOps Industries Pvt Ltd', ownershipPct: '74%',
    relationship: 'Majority Owned Subsidiary', status: 'Active', city: 'Mumbai' },
];

const COLUMNS: ListColumn<SubsidiaryRow>[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'parentCompany', label: 'Parent Company', sortable: true },
  { key: 'ownershipPct', label: 'Ownership %',
    render: r => <Badge variant="outline" className="text-[10px]">{r.ownershipPct}</Badge> },
  { key: 'relationship', label: 'Relationship',
    render: r => <Badge variant="secondary" className="text-[10px]">{r.relationship}</Badge> },
  { key: 'status', label: 'Status' },
  { key: 'city', label: 'City', sortable: true },
];

export default function SubsidiaryList() {
  return (
    <FoundationListPage<SubsidiaryRow>
      title="Subsidiaries"
      description="Entities owned by the parent — linked for consolidated reporting."
      breadcrumbs={[
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: 'Foundation' },
        { label: 'Subsidiaries' },
      ]}
      createHref="/erp/foundation/subsidiaries/create"
      createLabel="Add Subsidiary"
      columns={COLUMNS}
      data={MOCK_SUBSIDIARIES}
      searchKeys={['name', 'code', 'city']}
    />
  );
}
