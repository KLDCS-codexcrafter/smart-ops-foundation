import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BRANCH_TYPE_COLORS: Record<string, string> = {
  'Service Centre': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Retail Store': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Sales Office': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Collection Centre': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Branch Office': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'Regional Office': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Liaison Office': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Project Site Office': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Support Office': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Delivery Point': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

interface BranchRow {
  id: string; code: string; name: string; branchType: string;
  parentCompany: string; branchHead: string; status: string; city: string; state: string;
}

// [JWT] Replace with API call GET /api/foundation/branch-offices
const MOCK_BRANCHES: BranchRow[] = [
  { id: 'b1', code: 'BR001', name: 'Mumbai Service Centre', branchType: 'Service Centre',
    parentCompany: 'SmartOps Industries Pvt Ltd', branchHead: 'Ravi Kumar',
    status: 'Active', city: 'Mumbai', state: 'Maharashtra' },
  { id: 'b2', code: 'BR002', name: 'Delhi Sales Office', branchType: 'Sales Office',
    parentCompany: 'SmartOps Industries Pvt Ltd', branchHead: 'Priya Sharma',
    status: 'Active', city: 'New Delhi', state: 'Delhi' },
  { id: 'b3', code: 'BR003', name: 'Bengaluru Collection Centre', branchType: 'Collection Centre',
    parentCompany: 'SmartOps North India Pvt Ltd', branchHead: 'Suresh Patel',
    status: 'Inactive', city: 'Bengaluru', state: 'Karnataka' },
];

const COLUMNS: ListColumn<BranchRow>[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'branchType', label: 'Type',
    render: r => <Badge className={cn('text-[10px]', BRANCH_TYPE_COLORS[r.branchType] ?? 'bg-muted text-foreground')}>{r.branchType}</Badge> },
  { key: 'parentCompany', label: 'Company', sortable: true },
  { key: 'branchHead', label: 'Branch Head' },
  { key: 'status', label: 'Status' },
  { key: 'city', label: 'City', sortable: true },
  { key: 'state', label: 'State' },
];

export default function BranchOfficeList() {
  return (
    <FoundationListPage<BranchRow>
      title="Branch Offices"
      description="Operational locations: service centres, retail stores, offices, and more."
      breadcrumbs={[
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: 'Foundation' },
        { label: 'Branch Offices' },
      ]}
      createHref="/erp/foundation/branch-offices/create"
      createLabel="Add Branch Office"
      columns={COLUMNS}
      data={MOCK_BRANCHES}
      searchKeys={['name', 'code', 'city', 'branchType', 'branchHead']}
    />
  );
}
