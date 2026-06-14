/**
 * SubsidiaryList.tsx — CL-1 · B2-F1 · Foundation bridge.
 * Reads real seeded group via loadEntities() ⨝ listGroupStructure() instead of
 * MOCK_SUBSIDIARIES. Honest empty-state when no group is seeded.
 */
import { useMemo } from 'react';
import { FoundationListPage, ListColumn } from '@/components/foundation/FoundationListPage';
import { Badge } from '@/components/ui/badge';
import { loadEntities } from '@/data/mock-entities';
import { listGroupStructure } from '@/lib/intercompany-group-structure-engine';

interface SubsidiaryRow {
  id: string; code: string; name: string;
  parentCompany: string; ownershipPct: string;
  relationship: string; status: string; city: string;
}

function loadSubsidiaryRows(): SubsidiaryRow[] {
  const entities = loadEntities();
  const nodes = listGroupStructure();
  const byEntity = new Map(nodes.map(n => [n.entity_id, n]));
  // Subsidiaries = nodes with a parent and non-parent relationship
  const subs = entities.filter(e => {
    const n = byEntity.get(e.id);
    return e.type === 'subsidiary' || (n && n.relationship !== 'parent' && n.parent_entity_id);
  });
  // [JWT] GET /api/foundation/subsidiaries
  return subs.map(e => {
    const n = byEntity.get(e.id);
    const parent = n?.parent_entity_id ? entities.find(p => p.id === n.parent_entity_id) : null;
    return {
      id: e.id,
      code: e.shortCode ? `${e.shortCode}-SUB` : `SUB-${e.id}`,
      name: e.name,
      parentCompany: parent?.name ?? '—',
      ownershipPct: n?.ownership_pct != null ? `${n.ownership_pct}%` : '—',
      relationship: n?.relationship ?? '—',
      status: 'Active',
      city: '—',
    };
  });
}

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
  const data = useMemo(() => loadSubsidiaryRows(), []);
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
      data={data}
      searchKeys={['name', 'code', 'city']}
    />
  );
}
