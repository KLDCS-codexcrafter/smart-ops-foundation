/**
 * @file        src/pages/erp/docvault/transactions/DocumentRegister.tsx
 * @purpose     DocVault register · cross-card filter UI (Q-LOCK-15a)
 * @who         Document Controller · all departments
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block D.1
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ canonical · Q-LOCK-15a cross-card filter UI
 * @disciplines FR-29 · FR-30
 * @reuses      docvault-engine.loadDocuments
 * @[JWT]       GET /api/docvault/documents · query filters Phase 2
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';

export function DocumentRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter && d.document_type !== typeFilter) return false;
      if (projectFilter && d.project_id !== projectFilter) return false;
      if (customerFilter && d.customer_id !== customerFilter) return false;
      if (vendorFilter && d.vendor_id !== vendorFilter) return false;
      if (equipmentFilter && d.equipment_id !== equipmentFilter) return false;
      return true;
    });
  }, [docs, search, typeFilter, projectFilter, customerFilter, vendorFilter, equipmentFilter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Documents Register</h1>

      <Card>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input placeholder="Type filter (drawing, mom, ...)" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
          <Input placeholder="Project ID" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} />
          <Input placeholder="Customer ID" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
          <Input placeholder="Vendor ID" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
          <Input placeholder="Equipment ID" value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Current Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No documents.
                  </TableCell>
                </TableRow>
              ) : filtered.map((d) => {
                const cur = d.versions.find((v) => v.version_no === d.current_version);
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{d.originating_department_id}</TableCell>
                    <TableCell className="font-mono">{d.current_version}</TableCell>
                    <TableCell><Badge variant="secondary">{cur?.version_status ?? '—'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default DocumentRegister;
