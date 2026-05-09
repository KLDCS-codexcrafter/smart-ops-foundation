/**
 * @file src/pages/erp/qulicheak/reports/Iso9001Register.tsx
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BP
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useEntityCode } from '@/hooks/useEntityCode';
import { filterIso9001Docs } from '@/lib/iso9001-engine';
import { ISO9001_CLAUSE_LABELS, ISO9001_LINKED_TYPE_LABELS } from '@/types/iso9001';

export function Iso9001Register(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const docs = filterIso9001Docs(entityCode, { search });

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ISO 9001 Audit Register</h1>
        <p className="text-sm text-muted-foreground mt-1">Entity {entityCode} · {docs.length} documents</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Search title / auditor / description"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <div className="border rounded-lg divide-y">
        <div className="p-3 grid grid-cols-6 text-xs text-muted-foreground bg-muted/40">
          <span>ID</span><span>Clause</span><span>Title</span><span>Auditor</span><span>Date</span><span>Links</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No audit documents.</div>
        ) : docs.map((d) => (
          <div key={d.id} className="p-3 grid grid-cols-6 text-sm items-center">
            <span className="font-mono">{d.id}</span>
            <Badge variant="outline">{ISO9001_CLAUSE_LABELS[d.clause].split(' · ')[0]}</Badge>
            <a href={d.document_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
              {d.title}
            </a>
            <span>{d.auditor}</span>
            <span className="font-mono">{d.audit_date}</span>
            <span className="text-xs">
              {d.linked_records.length === 0 ? '—' : d.linked_records.map((r) => ISO9001_LINKED_TYPE_LABELS[r.type]).join(', ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
