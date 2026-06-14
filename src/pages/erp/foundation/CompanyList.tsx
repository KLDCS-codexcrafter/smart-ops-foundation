/**
 * CompanyList.tsx — CL-1 · B2-F1 · Foundation bridge.
 * Reads real seeded group via loadEntities() ⨝ listGroupStructure() instead of
 * MOCK_COMPANIES. Honest empty-state when no group is seeded.
 */
import { useMemo } from 'react';
import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';
import { loadEntities } from '@/data/mock-entities';
import { listGroupStructure } from '@/lib/intercompany-group-structure-engine';

interface CompanyRow {
  id: string; code: string; shortCode: string; name: string;
  parentCompany: string; status: string; city: string; state: string; createdAt: string;
}

function loadCompanyRows(): CompanyRow[] {
  const entities = loadEntities();
  const nodes = listGroupStructure();
  const byEntity = new Map(nodes.map(n => [n.entity_id, n]));
  // Parent + standalone companies = entities whose node is missing or relationship=parent
  const parentOrCompany = entities.filter(e => {
    const n = byEntity.get(e.id);
    return e.type === 'parent' || !n || n.relationship === 'parent';
  });
  // [JWT] GET /api/foundation/companies
  return parentOrCompany.map(e => {
    const n = byEntity.get(e.id);
    return {
      id: e.id,
      code: e.shortCode ? `${e.shortCode}001` : e.id.toUpperCase(),
      shortCode: e.shortCode ?? '',
      name: e.name,
      parentCompany: n?.parent_entity_id
        ? (entities.find(p => p.id === n.parent_entity_id)?.name ?? '—')
        : '—',
      status: 'Active',
      city: '—', state: '—',
      createdAt: '—',
    };
  });
}

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
  const data = useMemo(() => loadCompanyRows(), []);
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
      data={data}
      searchKeys={['name', 'code', 'shortCode', 'city']}
    />
  );
}
