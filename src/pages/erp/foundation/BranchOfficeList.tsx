/**
 * BranchOfficeList.tsx — CL-1 · B2-F1 · Foundation bridge.
 * Reads real seeded group via loadEntities() instead of MOCK_BRANCHES.
 * Honest empty-state when no branch entities are seeded.
 */
import { useMemo } from 'react';
import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { loadEntities } from '@/data/mock-entities';

const BRANCH_TYPE_COLORS: Record<string, string> = {
  'Branch Office': 'bg-muted/60 text-foreground border-border',
};

interface BranchRow {
  id: string; code: string; name: string; branchType: string;
  parentCompany: string; branchHead: string; status: string; city: string; state: string;
}

function loadBranchRows(): BranchRow[] {
  const entities = loadEntities();
  // [JWT] GET /api/foundation/branch-offices
  return entities
    .filter(e => e.type === 'branch')
    .map(e => ({
      id: e.id,
      code: e.shortCode ? `${e.shortCode}-BR` : `BR-${e.id}`,
      name: e.name,
      branchType: 'Branch Office',
      parentCompany: entities.find(p => p.type === 'parent')?.name ?? '—',
      branchHead: '—',
      status: 'Active',
      city: '—', state: '—',
    }));
}

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
  const data = useMemo(() => loadBranchRows(), []);
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
      data={data}
      searchKeys={['name', 'code', 'city', 'branchType', 'branchHead']}
    />
  );
}
